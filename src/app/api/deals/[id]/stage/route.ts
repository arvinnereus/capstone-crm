import { NextResponse } from "next/server";
import { ulid } from "ulid";

import { getDb } from "@/lib/db";
import { jsonError, parseBody } from "@/lib/api-helpers";
import { dealStageSchema } from "@/lib/schemas";
import { nowISO } from "@/lib/format";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const { data, error } = await parseBody(request, dealStageSchema);
  if (error) return error;

  const db = await getDb();
  const deal = await db
    .prepare("SELECT id, stage, value_cents FROM deals WHERE id = ?")
    .bind(id)
    .first<{ id: string; stage: string; value_cents: number }>();
  if (!deal) return jsonError("Deal not found", 404);
  if (deal.stage === data.to_stage) return NextResponse.json({ ok: true, unchanged: true });

  const now = nowISO();
  const sets: string[] = ["stage = ?", "stage_entered_at = ?", "updated_at = ?"];
  const values: (string | number | null)[] = [data.to_stage, now, now];

  if (data.to_stage === "won") {
    sets.push("won_at = ?", "final_value_cents = ?", "lost_at = NULL", "lost_reason = NULL");
    values.push(now, data.final_value_cents ?? deal.value_cents);
  } else if (data.to_stage === "lost") {
    sets.push("lost_at = ?", "lost_reason = ?", "won_at = NULL", "final_value_cents = NULL");
    values.push(now, data.lost_reason ?? null);
  } else {
    // Reopening or moving between open stages clears any close state
    sets.push("won_at = NULL", "final_value_cents = NULL", "lost_at = NULL", "lost_reason = NULL");
  }

  values.push(id);

  await db.batch([
    db.prepare(`UPDATE deals SET ${sets.join(", ")} WHERE id = ?`).bind(...values),
    db
      .prepare(
        `INSERT INTO deal_stage_history (id, deal_id, from_stage, to_stage, changed_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(ulid(), id, deal.stage, data.to_stage, now),
  ]);

  return NextResponse.json({ ok: true });
}
