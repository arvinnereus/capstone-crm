import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { jsonError, parseBody } from "@/lib/api-helpers";
import { followUpUpdateSchema } from "@/lib/schemas";
import { nowISO } from "@/lib/format";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const { data, error } = await parseBody(request, followUpUpdateSchema);
  if (error) return error;

  const db = await getDb();
  const existing = await db.prepare("SELECT id FROM follow_ups WHERE id = ?").bind(id).first();
  if (!existing) return jsonError("Follow-up not found", 404);

  const now = nowISO();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.action !== undefined) {
    fields.push("action = ?");
    values.push(data.action);
  }
  if (data.due_date !== undefined) {
    fields.push("due_date = ?");
    values.push(data.due_date);
  }
  if (data.done !== undefined) {
    fields.push("done = ?", "done_at = ?");
    values.push(data.done ? 1 : 0, data.done ? now : null);
  }
  if (fields.length === 0) return jsonError("No fields to update");

  fields.push("updated_at = ?");
  values.push(now, id);

  await db.prepare(`UPDATE follow_ups SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const db = await getDb();
  const result = await db.prepare("DELETE FROM follow_ups WHERE id = ?").bind(id).run();
  if (result.meta.changes === 0) return jsonError("Follow-up not found", 404);
  return NextResponse.json({ ok: true });
}
