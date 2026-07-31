import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { parseBody } from "@/lib/api-helpers";

const settingsSchema = z.object({
  revenue_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  milestones: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        target_cents: z.number().int().min(0),
      })
    )
    .max(8)
    .optional(),
});

export async function GET() {
  const db = await getDb();
  const rows = await db
    .prepare("SELECT key, value FROM settings WHERE key IN ('revenue_start_date','milestones')")
    .all<{ key: string; value: string }>();
  const map = Object.fromEntries(rows.results.map((r) => [r.key, JSON.parse(r.value)]));
  return NextResponse.json(map);
}

export async function PATCH(request: Request) {
  const { data, error } = await parseBody(request, settingsSchema);
  if (error) return error;

  const db = await getDb();
  const statements = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    statements.push(
      db
        .prepare(
          "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
        )
        .bind(key, JSON.stringify(value))
    );
  }
  if (statements.length > 0) await db.batch(statements);
  return NextResponse.json({ ok: true });
}
