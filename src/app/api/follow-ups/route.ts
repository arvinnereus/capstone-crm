import { NextResponse } from "next/server";
import { ulid } from "ulid";

import { getDb } from "@/lib/db";
import { jsonError, parseBody } from "@/lib/api-helpers";
import { followUpCreateSchema } from "@/lib/schemas";
import { nowISO, todaySG } from "@/lib/format";

export async function GET(request: Request) {
  const db = await getDb();
  const url = new URL(request.url);
  const status = url.searchParams.get("status"); // pending | overdue | done
  const contactId = url.searchParams.get("contact_id");

  const conditions: string[] = [];
  const params: string[] = [];

  if (status === "pending") conditions.push("f.done = 0");
  if (status === "done") conditions.push("f.done = 1");
  if (status === "overdue") {
    conditions.push("f.done = 0 AND f.due_date < ?");
    params.push(todaySG());
  }
  if (contactId) {
    conditions.push("f.contact_id = ?");
    params.push(contactId);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  if (url.searchParams.get("count") === "1") {
    const row = await db
      .prepare(`SELECT COUNT(*) AS count FROM follow_ups f ${where}`)
      .bind(...params)
      .first<{ count: number }>();
    return NextResponse.json({ count: row?.count ?? 0 });
  }

  const { results } = await db
    .prepare(
      `SELECT f.*, c.name AS contact_name, c.company AS contact_company, d.name AS deal_name
       FROM follow_ups f
       JOIN contacts c ON c.id = f.contact_id
       LEFT JOIN deals d ON d.id = f.deal_id
       ${where} ORDER BY f.done ASC, f.due_date ASC LIMIT 500`
    )
    .bind(...params)
    .all();

  return NextResponse.json({ follow_ups: results });
}

export async function POST(request: Request) {
  const { data, error } = await parseBody(request, followUpCreateSchema);
  if (error) return error;

  const db = await getDb();
  const contact = await db.prepare("SELECT id FROM contacts WHERE id = ?").bind(data.contact_id).first();
  if (!contact) return jsonError("Contact not found", 404);

  const id = ulid();
  const now = nowISO();
  await db
    .prepare(
      `INSERT INTO follow_ups (id, contact_id, deal_id, action, due_date, done, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`
    )
    .bind(id, data.contact_id, data.deal_id ?? null, data.action, data.due_date, now, now)
    .run();

  return NextResponse.json({ id }, { status: 201 });
}
