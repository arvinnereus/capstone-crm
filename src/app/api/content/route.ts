import { NextResponse } from "next/server";
import { ulid } from "ulid";

import { getDb } from "@/lib/db";
import { jsonError, parseBody } from "@/lib/api-helpers";
import { contentJobCreateSchema } from "@/lib/schemas";
import { nowISO } from "@/lib/format";
import { listContentJobs } from "@/lib/queries";
import { buildImagePrompt, draftShotList, getContentEnv, kieCreateTask } from "@/lib/content";

const MIN_ARTICLE_LENGTH = 200; // chars — below this, treat a URL fetch as failed/blocked

function extractArticleText(html: string): { title: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "";

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  return { title, text };
}

export async function GET(request: Request) {
  const db = await getDb();
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 200);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10) || 0;

  const jobs = await listContentJobs(db, { limit, offset });
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const { data, error } = await parseBody(request, contentJobCreateSchema);
  if (error) return error;

  let title = "";
  let articleText = "";

  if (data.inputType === "url") {
    try {
      const res = await fetch(data.inputUrl!, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; CapstoneCRM-ContentBot/1.0)" },
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const html = await res.text();
      const extracted = extractArticleText(html);
      title = extracted.title;
      articleText = extracted.text;
      if (articleText.length < MIN_ARTICLE_LENGTH) throw new Error("extracted text too short");
    } catch (e) {
      return jsonError(
        `Could not fetch this article (it may be behind a paywall or bot protection). Please paste the article text instead. (${
          e instanceof Error ? e.message : "unknown error"
        })`,
        422
      );
    }
  } else {
    articleText = data.inputText!.trim();
    if (articleText.length < MIN_ARTICLE_LENGTH) {
      return jsonError("inputText must be a real article, not a short snippet", 400);
    }
  }

  const db = await getDb();
  const { OPENAI_API_KEY, KIE_API_KEY } = await getContentEnv();

  const jobId = ulid();
  const now = nowISO();

  await db
    .prepare(
      `INSERT INTO content_jobs (id, status, language_mode, input_type, input_url, input_text, article_title, created_at, updated_at)
       VALUES (?, 'drafting', ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(jobId, data.languageMode, data.inputType, data.inputUrl ?? null, articleText, title || null, now, now)
    .run();

  let draft;
  try {
    draft = await draftShotList(OPENAI_API_KEY, { title, articleText, languageMode: data.languageMode });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "unknown error";
    await db
      .prepare("UPDATE content_jobs SET status = 'failed', error = ?, updated_at = ? WHERE id = ?")
      .bind(errMsg.slice(0, 500), nowISO(), jobId)
      .run();
    return jsonError(`Shot-list drafting failed: ${errMsg}`, 502);
  }

  await db
    .prepare(
      "UPDATE content_jobs SET status = 'drafted', article_title = ?, core_argument = ?, updated_at = ? WHERE id = ?"
    )
    .bind(draft.article_title || title || null, draft.core_argument || null, nowISO(), jobId)
    .run();

  const shotIds: { id: string; prompt: string }[] = [];
  for (let i = 0; i < draft.shots.length; i++) {
    const shot = draft.shots[i];
    const prompt = buildImagePrompt(shot, data.languageMode);
    const shotId = ulid();
    const shotNow = nowISO();
    await db
      .prepare(
        `INSERT INTO content_shots
         (id, job_id, shot_index, theme, structure_type, core_idea, composition, elements_json, labels_json, image_prompt, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
      )
      .bind(
        shotId,
        jobId,
        i,
        shot.theme,
        shot.structure_type,
        shot.core_idea,
        shot.composition,
        JSON.stringify(shot.suggested_elements ?? []),
        JSON.stringify(shot.handwritten_labels ?? []),
        prompt,
        shotNow,
        shotNow
      )
      .run();
    shotIds.push({ id: shotId, prompt });
  }

  await Promise.allSettled(
    shotIds.map(async (row) => {
      try {
        const taskId = await kieCreateTask(KIE_API_KEY, row.prompt);
        await db
          .prepare("UPDATE content_shots SET status = 'generating', kie_task_id = ?, updated_at = ? WHERE id = ?")
          .bind(taskId, nowISO(), row.id)
          .run();
      } catch (e) {
        await db
          .prepare("UPDATE content_shots SET status = 'failed', error = ?, updated_at = ? WHERE id = ?")
          .bind((e instanceof Error ? e.message : "unknown error").slice(0, 500), nowISO(), row.id)
          .run();
      }
    })
  );

  await db
    .prepare("UPDATE content_jobs SET status = 'generating', updated_at = ? WHERE id = ?")
    .bind(nowISO(), jobId)
    .run();

  return NextResponse.json({ id: jobId }, { status: 201 });
}
