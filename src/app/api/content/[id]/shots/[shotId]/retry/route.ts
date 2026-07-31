import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { jsonError } from "@/lib/api-helpers";
import { nowISO } from "@/lib/format";
import type { ContentShotRow } from "@/lib/types";
import { getContentEnv, kieCreateTask } from "@/lib/content";

type Params = { params: Promise<{ id: string; shotId: string }> };

/** Re-fire kie.ai for one failed shot without touching the rest of the job. */
export async function POST(_request: Request, { params }: Params) {
  const { id: jobId, shotId } = await params;
  const db = await getDb();

  const shot = await db
    .prepare("SELECT * FROM content_shots WHERE id = ? AND job_id = ?")
    .bind(shotId, jobId)
    .first<ContentShotRow>();
  if (!shot) return jsonError("Shot not found", 404);
  if (shot.status !== "failed") {
    return jsonError(`Shot is '${shot.status}', can only retry a 'failed' shot`, 400);
  }

  const { KIE_API_KEY } = await getContentEnv();

  try {
    const taskId = await kieCreateTask(KIE_API_KEY, shot.image_prompt ?? "");
    await db
      .prepare(
        "UPDATE content_shots SET status = 'generating', kie_task_id = ?, kie_state = NULL, error = NULL, updated_at = ? WHERE id = ?"
      )
      .bind(taskId, nowISO(), shotId)
      .run();
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "unknown error";
    await db
      .prepare("UPDATE content_shots SET status = 'failed', error = ?, updated_at = ? WHERE id = ?")
      .bind(errMsg.slice(0, 500), nowISO(), shotId)
      .run();
    return jsonError(`Retry failed: ${errMsg}`, 502);
  }

  // Flip the parent job back to 'generating' so the poll loop resumes.
  await db
    .prepare("UPDATE content_jobs SET status = 'generating', updated_at = ? WHERE id = ?")
    .bind(nowISO(), jobId)
    .run();

  return NextResponse.json({ ok: true });
}
