import { NextResponse } from "next/server";
import { ulid } from "ulid";

import { getDb } from "@/lib/db";
import { jsonError, parseBody } from "@/lib/api-helpers";
import { dealCreateSchema } from "@/lib/schemas";
import { nowISO } from "@/lib/format";

export async function GET(request: Request) {
  const db = await getDb();
  const url = new URL(request.url);

  const conditions: string[] = [];
  const params: string[] = [];
  for (const field of ["stage", "stream", "contact_id"] as const) {
    const value = url.searchParams.get(field);
    if (value) {
      conditions.push(`d.${field} = ?`);
      params.push(value);
    }
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const { results } = await db
    .prepare(
      `SELECT d.*, c.name AS contact_name, c.company AS contact_company
       FROM deals d JOIN contacts c ON c.id = d.contact_id
       ${where} ORDER BY d.updated_at DESC`
    )
    .bind(...params)
    .all();

  return NextResponse.json({ deals: results });
}

export async function POST(request: Request) {
  const { data, error } = await parseBody(request, dealCreateSchema);
  if (error) return error;

  const db = await getDb();
  const contact = await db
    .prepare("SELECT id, brand FROM contacts WHERE id = ?")
    .bind(data.contact_id)
    .first<{ id: string; brand: string }>();
  if (!contact) return jsonError("Contact not found", 404);

  const id = ulid();
  const now = nowISO();

  await db.batch([
    db
      .prepare(
        `INSERT INTO deals (id, contact_id, name, stream, stage, value_cents, expected_close_date, stage_entered_at, notes, brand, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'lead', ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        data.contact_id,
        data.name,
        data.stream,
        data.value_cents,
        data.expected_close_date ?? null,
        now,
        data.notes ?? null,
        contact.brand,
        now,
        now
      ),
    db
      .prepare(
        `INSERT INTO deal_stage_history (id, deal_id, from_stage, to_stage, changed_at)
         VALUES (?, ?, NULL, 'lead', ?)`
      )
      .bind(ulid(), id, now),
  ]);

  return NextResponse.json({ id }, { status: 201 });
}
