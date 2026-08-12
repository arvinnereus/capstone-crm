import { NextResponse } from "next/server";
import { ulid } from "ulid";

import { getDb } from "@/lib/db";
import { jsonError, parseBody } from "@/lib/api-helpers";
import { contactCreateSchema } from "@/lib/schemas";
import { nowISO, todaySG } from "@/lib/format";

export async function GET(request: Request) {
  const db = await getDb();
  const url = new URL(request.url);

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  const search = url.searchParams.get("search");
  if (search) {
    conditions.push("(c.name LIKE ? OR c.company LIKE ? OR c.email LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  for (const field of ["segment", "status", "lead_source", "brand"] as const) {
    const value = url.searchParams.get(field);
    if (value) {
      conditions.push(`c.${field} = ?`);
      params.push(value);
    }
  }
  if (url.searchParams.get("grant_eligible") === "1") {
    conditions.push("c.grant_eligible = 1");
  }
  if (url.searchParams.get("overdue") === "1") {
    conditions.push(
      "EXISTS (SELECT 1 FROM follow_ups f WHERE f.contact_id = c.id AND f.done = 0 AND f.due_date < ?)"
    );
    params.push(todaySG());
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 200);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10) || 0;

  const { results } = await db
    .prepare(
      `SELECT c.*,
        (SELECT MAX(t.occurred_at) FROM touchpoints t WHERE t.contact_id = c.id) AS last_touch,
        (SELECT MIN(f.due_date) FROM follow_ups f WHERE f.contact_id = c.id AND f.done = 0) AS next_due,
        (SELECT COUNT(*) FROM deals d WHERE d.contact_id = c.id AND d.stage NOT IN ('won','lost')) AS open_deals
       FROM contacts c ${where}
       ORDER BY c.updated_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(...params, limit, offset)
    .all();

  return NextResponse.json({ contacts: results });
}

export async function POST(request: Request) {
  const { data, error } = await parseBody(request, contactCreateSchema);
  if (error) return error;

  const db = await getDb();
  const id = ulid();
  const now = nowISO();

  try {
    await db
      .prepare(
        `INSERT INTO contacts (id, name, company, role, email, phone, segment, status, lead_source, grant_eligible, notes, brand, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        data.name,
        data.company ?? null,
        data.role ?? null,
        data.email ?? null,
        data.phone ?? null,
        data.segment ?? null,
        data.status,
        data.lead_source ?? null,
        data.grant_eligible ? 1 : 0,
        data.notes ?? null,
        data.brand,
        now,
        now
      )
      .run();
  } catch (e) {
    return jsonError(`Failed to create contact: ${e instanceof Error ? e.message : "unknown"}`, 500);
  }

  return NextResponse.json({ id }, { status: 201 });
}
