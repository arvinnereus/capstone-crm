import { NextResponse } from "next/server";
import { ulid } from "ulid";
import { getDb } from "@/lib/db";
import { nowISO } from "@/lib/format";

// Public write-only endpoint — excluded from Basic auth middleware matcher.
// Called by: capstoneconsulting.com.sg contact form, assessment-worker, Abigail/OpenClaw webhook.
// No auth required — this endpoint only creates contacts, never reads or deletes.

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    source,        // 'form' | 'assessment' | 'whatsapp'
    name,
    email,
    phone,
    organisation,  // maps to company
    programme,
    inquiry,
    score,
    level,
  } = body as Record<string, string | number | null | undefined>;

  const leadSourceMap: Record<string, string> = {
    form: "website",
    assessment: "website",
    whatsapp: "abigail",
  };
  const lead_source = leadSourceMap[source as string] ?? "other";

  const noteLines: string[] = [];
  if (source === "assessment") {
    if (level) noteLines.push(`AI Level: ${level}`);
    if (score != null) noteLines.push(`Score: ${score}/72`);
    if (programme) noteLines.push(`Programme: ${programme}`);
  }
  if (inquiry) noteLines.push(`Inquiry: ${inquiry}`);
  const notes = noteLines.length ? noteLines.join("\n") : null;

  const contactName = ((name as string) ?? "").trim() || (email as string) || "Unknown";

  const db = await getDb();
  const id = ulid();
  const now = nowISO();

  try {
    await db
      .prepare(
        `INSERT INTO contacts (id, name, company, email, phone, lead_source, notes, status, grant_eligible, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'prospect', 0, ?, ?)`
      )
      .bind(
        id,
        contactName,
        (organisation as string) ?? null,
        (email as string) ?? null,
        (phone as string) ?? null,
        lead_source,
        notes,
        now,
        now
      )
      .run();
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id }, { status: 201 });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
