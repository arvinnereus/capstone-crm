import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { jsonError, parseBody } from "@/lib/api-helpers";
import { dealUpdateSchema } from "@/lib/schemas";
import { nowISO } from "@/lib/format";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const db = await getDb();
  const deal = await db
    .prepare(
      `SELECT d.*, c.name AS contact_name, c.company AS contact_company
       FROM deals d JOIN contacts c ON c.id = d.contact_id WHERE d.id = ?`
    )
    .bind(id)
    .first();
  if (!deal) return jsonError("Deal not found", 404);

  const history = await db
    .prepare("SELECT * FROM deal_stage_history WHERE deal_id = ? ORDER BY changed_at DESC")
    .bind(id)
    .all();

  return NextResponse.json({ deal, stage_history: history.results });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const { data, error } = await parseBody(request, dealUpdateSchema);
  if (error) return error;

  const db = await getDb();
  const existing = await db.prepare("SELECT id FROM deals WHERE id = ?").bind(id).first();
  if (!existing) return jsonError("Deal not found", 404);

  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    fields.push(`${key} = ?`);
    values.push(value ?? null);
  }
  if (fields.length === 0) return jsonError("No fields to update");

  fields.push("updated_at = ?");
  values.push(nowISO(), id);

  await db.prepare(`UPDATE deals SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const db = await getDb();
  const result = await db.prepare("DELETE FROM deals WHERE id = ?").bind(id).run();
  if (result.meta.changes === 0) return jsonError("Deal not found", 404);
  return NextResponse.json({ ok: true });
}
