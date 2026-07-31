import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { jsonError } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const db = await getDb();
  const result = await db.prepare("DELETE FROM touchpoints WHERE id = ?").bind(id).run();
  if (result.meta.changes === 0) return jsonError("Touchpoint not found", 404);
  return NextResponse.json({ ok: true });
}
