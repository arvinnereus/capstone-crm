/**
 * Content Creation module — Xiaohei illustration pipeline. Pure Workers-runtime
 * code (fetch only), mirrors sync-core.ts's shape: resources (API keys, R2
 * bucket) are passed in by the caller rather than fetched here, keeping this
 * file reusable/testable independent of getCloudflareContext.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";

import type { ContentLanguageMode, ContentStructureType } from "@/lib/constants";
import { CONTENT_STRUCTURE_TYPES } from "@/lib/constants";
import type { ContentShotRow } from "@/lib/types";

// ---------- env access ----------
// OPENAI_API_KEY / KIE_API_KEY / CONTENT_IMAGES aren't in the generated
// CloudflareEnv ambient type until wrangler.jsonc declares them and
// `npm run cf-typegen` is re-run — cast here rather than block on that.
export type ContentEnv = {
  OPENAI_API_KEY: string;
  KIE_API_KEY: string;
  CONTENT_IMAGES: R2Bucket;
};

export async function getContentEnv(): Promise<ContentEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env as unknown as ContentEnv;
}

// ---------- shot-list drafting (OpenAI) ----------

export type DraftedShot = {
  theme: string;
  structure_type: ContentStructureType;
  core_idea: string;
  composition: string;
  suggested_elements: string[];
  handwritten_labels: string[];
};

export type ShotListDraft = {
  article_title: string;
  core_argument: string;
  shots: DraftedShot[];
};

function buildSystemPrompt(languageMode: ContentLanguageMode): string {
  const labelRule =
    languageMode === "en"
      ? "handwritten_labels MUST be in English, 1-4 words each. Never full sentences."
      : "handwritten_labels 必须是中文，每条 2-8 个字，绝不能是完整句子。";

  return `You are an art director who turns an article into a shot list for hand-drawn illustrations featuring a recurring black IP character called Xiaohei (小黑).

Xiaohei is a solid-black, white-dot-eyed, thin-legged, deadpan creature. In every shot Xiaohei must be the one DOING the core physical action described by the metaphor — never standing beside it decoratively.

STEP 1 — Read the article and extract: the core argument; the "cognitive-turn" paragraphs (where the reader's understanding should shift); which specific moments deserve an illustration ("cognitive anchors" — a core judgment, a before/after, a metaphor). Do NOT illustrate evenly across the article — pick only the anchors that matter.

STEP 2 — Decide the number of images (1 to 8, never more): short article (roughly under 600 words) → 1-3; medium → 3-5; long (over 1500 words) → up to 8, hard cap 8.

STEP 3 — For each image invent an ORIGINAL physical metaphor using this three-step method: (a) turn the abstract concept into a physical action (stuck, leaking, fermenting, overflowing); (b) turn the system/idea into a low-tech physical object (a leaky pipe, a mailbox, a well, a scale); (c) make Xiaohei perform that action on that object.

Never reuse these banned prior compositions: conveyor-belt-breakpoints, judgment-lever, fish-cutting. Invent something fresh for every shot.

For each shot return: theme; structure_type (exactly one of ${CONTENT_STRUCTURE_TYPES.join(", ")}); core_idea; composition (where Xiaohei is, what object/action embodies the metaphor); suggested_elements (short concrete visual items); handwritten_labels (4-8 items — ${labelRule} — NEVER full sentences, image models garble long text).

Respond only with JSON matching the given schema. No markdown, no commentary.`;
}

const SHOT_LIST_JSON_SCHEMA = {
  name: "shot_list",
  strict: true,
  schema: {
    type: "object",
    properties: {
      article_title: { type: "string" },
      core_argument: { type: "string" },
      shots: {
        type: "array",
        minItems: 1,
        maxItems: 8,
        items: {
          type: "object",
          properties: {
            theme: { type: "string" },
            structure_type: { type: "string", enum: [...CONTENT_STRUCTURE_TYPES] },
            core_idea: { type: "string" },
            composition: { type: "string" },
            suggested_elements: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 6 },
            handwritten_labels: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 8 },
          },
          required: ["theme", "structure_type", "core_idea", "composition", "suggested_elements", "handwritten_labels"],
          additionalProperties: false,
        },
      },
    },
    required: ["article_title", "core_argument", "shots"],
    additionalProperties: false,
  },
};

export async function draftShotList(
  openaiApiKey: string,
  { title, articleText, languageMode }: { title: string; articleText: string; languageMode: ContentLanguageMode }
): Promise<ShotListDraft> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: buildSystemPrompt(languageMode) },
        {
          role: "user",
          content: `Article title (if any): ${title || "(none)"}\nLanguage mode: ${languageMode}\n\nArticle text:\n${articleText}`,
        },
      ],
      response_format: { type: "json_schema", json_schema: SHOT_LIST_JSON_SCHEMA },
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI error ${res.status}: ${errText}`);
  }
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return JSON.parse(data.choices[0].message.content) as ShotListDraft;
}

// ---------- kie.ai prompt builder ----------

const VISUAL_DNA =
  "Pure white background. Minimalist black hand-drawn line art, slightly wobbly lines, lots of empty space. Sparse red/orange/blue handwritten annotations used sparingly. Do NOT use: gradients, drop shadows, paper texture, PPT-infographic style, cute-mascot style, children's-book illustration style, or realistic UI mockups.";

const XIAOHEI_BLOCK =
  'Recurring character "Xiaohei": a solid black silhouette creature, two small white dot eyes, thin stick legs, deadpan expression. Xiaohei must be actively performing the core action of the scene, not standing beside it.';

export function buildImagePrompt(shot: DraftedShot, languageMode: ContentLanguageMode): string {
  const labelHeader =
    languageMode === "en"
      ? "Handwritten labels (use exactly these words, nothing else):"
      : "手写标注（只能使用以下文字，不得添加其他文字）：";

  const elements = (shot.suggested_elements || []).join(", ");
  const labels = (shot.handwritten_labels || []).join(" / ");

  return [
    `VISUAL DNA: ${VISUAL_DNA}`,
    `CHARACTER: ${XIAOHEI_BLOCK}`,
    `THEME: ${shot.theme}`,
    `STRUCTURE TYPE: ${shot.structure_type}`,
    `CORE IDEA: ${shot.core_idea}`,
    `COMPOSITION: ${shot.composition}`,
    `SUGGESTED ELEMENTS: ${elements}`,
    `${labelHeader} ${labels}`,
    "COLOR USE: black = main line art and Xiaohei; orange = main flow/arrows; red = warnings and key results only; blue = secondary notes only. Use color sparingly.",
    "CONSTRAINTS: one structure per image. Subject occupies roughly 40-60% of the canvas. At least 35% of the canvas stays blank. Maximum 5-8 labels total, matching the list above exactly. No title text in the top-left corner. Avoid a formal-diagram look. Invent a fresh metaphor — do not copy prior examples or reused compositions.",
    "Do not render any text on the image other than the exact handwritten labels listed above. Do not turn any instruction, description, or composition sentence into on-image text.",
  ].join("\n\n");
}

// ---------- kie.ai client ----------

export async function kieCreateTask(kieApiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${kieApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "nano-banana-pro",
      input: { prompt, aspect_ratio: "16:9", resolution: "2K", output_format: "png" },
    }),
  });
  const data = (await res.json()) as { code: number; data?: { taskId?: string; task_id?: string } };
  if (data.code !== 200) {
    throw new Error(`kie.ai createTask failed: ${JSON.stringify(data)}`);
  }
  const taskId = data.data?.taskId || data.data?.task_id;
  if (!taskId) throw new Error(`kie.ai createTask returned no taskId: ${JSON.stringify(data)}`);
  return taskId;
}

const SUCCESS_STATES = new Set(["success", "completed", "succeeded", "1"]);
const FAIL_STATES = new Set(["fail", "failed", "error", "2", "3"]);

export type KiePollResult = { state: "success" | "failed" | "pending"; raw: unknown };

export async function kiePollTask(kieApiKey: string, taskId: string): Promise<KiePollResult> {
  const headers = { Authorization: `Bearer ${kieApiKey}` };
  let res = await fetch(`https://api.kie.ai/api/v1/jobs/getTaskDetails?taskId=${taskId}`, { headers });
  if (res.status === 404) {
    res = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, { headers });
  }
  const body = (await res.json()) as { data?: { state?: string; status?: string } };
  const state = String(body?.data?.state ?? body?.data?.status ?? "").toLowerCase();
  if (SUCCESS_STATES.has(state)) return { state: "success", raw: body };
  if (FAIL_STATES.has(state)) return { state: "failed", raw: body };
  return { state: "pending", raw: body };
}

const URL_RE = /^https?:\/\/\S+\.(png|jpe?g|webp|mp4|mov)(\?\S*)?$/i;

/**
 * kie.ai nests the real payload as JSON-ENCODED STRINGS inside its response
 * (e.g. `resultJson`, `param` are strings containing JSON, not nested
 * objects) — must JSON.parse and recurse into any string that looks like
 * embedded JSON, or the actual output URL (buried in `data.resultJson`) is
 * never found and every job hangs at "generating" forever. Confirmed against
 * a real kie.ai response during development; do not simplify this away.
 */
export function extractOutputUrl(obj: unknown, inputStrings: string[] = []): string | null {
  const found: string[] = [];
  function walk(node: unknown) {
    if (typeof node === "string") {
      if (URL_RE.test(node) && !inputStrings.includes(node)) {
        found.push(node);
        return;
      }
      const trimmed = node.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          walk(JSON.parse(trimmed));
        } catch {
          /* not actually JSON, ignore */
        }
      }
    } else if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node && typeof node === "object") {
      Object.values(node).forEach(walk);
    }
  }
  walk(obj);
  return found[0] || null;
}

// ---------- R2 rehosting ----------

export async function rehostToR2(bucket: R2Bucket, sourceUrl: string, key: string): Promise<{ r2Key: string }> {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Failed to fetch source image ${sourceUrl}: ${res.status}`);
  const contentType = res.headers.get("Content-Type") || "image/png";
  const buf = await res.arrayBuffer();
  await bucket.put(key, buf, { httpMetadata: { contentType } });
  return { r2Key: key };
}

/** Derive the served image URL from a stored r2_key — never stored redundantly in D1. */
export function imageUrlForKey(key: string): string {
  return `/api/content/image/${key}`;
}

// ---------- advance a single generating shot by one tick (no loop, no sleep) ----------

export async function advanceShot(
  db: D1Database,
  bucket: R2Bucket,
  kieApiKey: string,
  shot: ContentShotRow
): Promise<ContentShotRow> {
  if (shot.status !== "generating" || !shot.kie_task_id) return shot;

  const { state, raw } = await kiePollTask(kieApiKey, shot.kie_task_id);

  if (state === "pending") return shot;

  if (state === "failed") {
    const raw2 = raw as { data?: { state?: string; status?: string } };
    const errMsg = JSON.stringify(raw2?.data ?? raw).slice(0, 500);
    const now = new Date().toISOString();
    await db
      .prepare("UPDATE content_shots SET status = 'failed', kie_state = ?, error = ?, updated_at = ? WHERE id = ?")
      .bind(String(raw2?.data?.state ?? raw2?.data?.status ?? ""), errMsg, now, shot.id)
      .run();
    return { ...shot, status: "failed", error: errMsg };
  }

  // state === "success"
  const sourceUrl = extractOutputUrl(raw, [shot.image_prompt ?? ""]);
  if (!sourceUrl) return shot; // reported success but no URL yet — treat as still pending, poll again next tick

  const key = `jobs/${shot.job_id}/${shot.id}.png`;
  const { r2Key } = await rehostToR2(bucket, sourceUrl, key);

  const now = new Date().toISOString();
  await db
    .prepare(
      "UPDATE content_shots SET status = 'done', source_image_url = ?, r2_key = ?, updated_at = ? WHERE id = ?"
    )
    .bind(sourceUrl, r2Key, now, shot.id)
    .run();

  return { ...shot, status: "done", source_image_url: sourceUrl, r2_key: r2Key, error: null };
}
