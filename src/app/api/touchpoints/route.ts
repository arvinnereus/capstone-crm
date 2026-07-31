import { NextResponse } from "next/server";
import { ulid } from "ulid";

import { getDb } from "@/lib/db";
import { jsonError, parseBody } from "@/lib/api-helpers";
import { touchpointCreateSchema } from "@/lib/schemas";
import { nowISO } from "@/lib/format";

export async function GET(request: Request) {
  const db = await getDb();
  const url = new URL(request.url);

  const conditions: string[] = [];
  const params: string[] = [];
  for (const field of ["contact_id", "deal_id"] as const) {
    const value = url.searchParams.get(field);
    if (value) {
      conditions.push(`t.${field} = ?`);
      params.push(value);
    }
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const { results } = await db
    .prepare(
      `SELECT t.*, c.name AS contact_name FROM touchpoints t
       JOIN contacts c ON c.id = t.contact_id
       ${where} ORDER BY t.occurred_at DESC, t.created_at DESC LIMIT 200`
    )
    .bind(...params)
    .all();

  return NextResponse.json({ touchpoints: results });
}

export async function POST(request: Request) {
  const { data, error } = await parseBody(request, touchpointCreateSchema);
  if (error) return error;

  const db = await getDb();
  const contact = await db.prepare("SELECT id FROM contacts WHERE id = ?").bind(data.contact_id).first();
  if (!contact) return jsonError("Contact not found", 404);

  const id = ulid();
  await db
    .prepare(
      `INSERT INTO touchpoints (id, contact_id, deal_id, type, occurred_at, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, data.contact_id, data.deal_id ?? null, data.type, data.occurred_at, data.note ?? null, nowISO())
    .run();

  return NextResponse.json({ id }, { status: 201 });
}
