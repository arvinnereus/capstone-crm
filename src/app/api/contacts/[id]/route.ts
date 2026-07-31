import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { jsonError, parseBody } from "@/lib/api-helpers";
import { contactUpdateSchema } from "@/lib/schemas";
import { nowISO } from "@/lib/format";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const db = await getDb();

  const contact = await db.prepare("SELECT * FROM contacts WHERE id = ?").bind(id).first();
  if (!contact) return jsonError("Contact not found", 404);

  const [deals, touchpoints, followUps, stageHistory] = await Promise.all([
    db.prepare("SELECT * FROM deals WHERE contact_id = ? ORDER BY created_at DESC").bind(id).all(),
    db
      .prepare("SELECT * FROM touchpoints WHERE contact_id = ? ORDER BY occurred_at DESC, created_at DESC")
      .bind(id)
      .all(),
    db
      .prepare("SELECT * FROM follow_ups WHERE contact_id = ? ORDER BY done ASC, due_date ASC")
      .bind(id)
      .all(),
    db
      .prepare(
        `SELECT h.*, d.name AS deal_name FROM deal_stage_history h
         JOIN deals d ON d.id = h.deal_id
         WHERE d.contact_id = ? ORDER BY h.changed_at DESC`
      )
      .bind(id)
      .all(),
  ]);

  return NextResponse.json({
    contact,
    deals: deals.results,
    touchpoints: touchpoints.results,
    follow_ups: followUps.results,
    stage_history: stageHistory.results,
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const { data, error } = await parseBody(request, contactUpdateSchema);
  if (error) return error;

  const db = await getDb();
  const existing = await db.prepare("SELECT id FROM contacts WHERE id = ?").bind(id).first();
  if (!existing) return jsonError("Contact not found", 404);

  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    fields.push(`${key} = ?`);
    values.push(typeof value === "boolean" ? (value ? 1 : 0) : value ?? null);
  }
  if (fields.length === 0) return jsonError("No fields to update");

  fields.push("updated_at = ?");
  values.push(nowISO(), id);

  await db.prepare(`UPDATE contacts SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const db = await getDb();
  const result = await db.prepare("DELETE FROM contacts WHERE id = ?").bind(id).run();
  if (result.meta.changes === 0) return jsonError("Contact not found", 404);
  return NextResponse.json({ ok: true });
}
