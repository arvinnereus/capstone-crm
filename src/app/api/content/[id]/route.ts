import { NextResponse } from "next/server";

import type { ContentJobStatus } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { jsonError } from "@/lib/api-helpers";
import { nowISO } from "@/lib/format";
import { getContentJobDetail } from "@/lib/queries";
import { advanceShot, getContentEnv } from "@/lib/content";

type Params = { params: Promise<{ id: string }> };

/**
 * The "tick": advances every still-generating shot by one poll step (no
 * loop, no sleep — the client re-calls this every ~4s while the job is in
 * flight), recomputes + persists job status, returns the current job +
 * shots. Safe to call repeatedly, including after the job is already done
 * (self-heals an abandoned/reopened job too).
 */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const db = await getDb();

  const detail = await getContentJobDetail(db, id);
  if (!detail) return jsonError("Content job not found", 404);
  const { job, shots } = detail;

  const { KIE_API_KEY, CONTENT_IMAGES } = await getContentEnv();
  const advanced = await Promise.all(shots.map((shot) => advanceShot(db, CONTENT_IMAGES, KIE_API_KEY, shot)));

  if (job.status === "generating") {
    const anyGenerating = advanced.some((s) => s.status === "generating" || s.status === "pending");
    const anyDone = advanced.some((s) => s.status === "done");
    const allSettled = advanced.every((s) => s.status === "done" || s.status === "failed");

    let newStatus: ContentJobStatus = job.status;
    if (!anyGenerating && allSettled) {
      newStatus = anyDone ? "done" : "failed";
    }

    if (newStatus !== job.status) {
      await db
        .prepare("UPDATE content_jobs SET status = ?, updated_at = ? WHERE id = ?")
        .bind(newStatus, nowISO(), id)
        .run();
      job.status = newStatus;
    }
  }

  return NextResponse.json({ job, shots: advanced });
}
