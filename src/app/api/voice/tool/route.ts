import { NextResponse } from "next/server";

import { runAssistantTool } from "@/lib/assistant";
import { getActiveBrandView } from "@/lib/brand-context";
import { getDb } from "@/lib/db";
import { jsonError } from "@/lib/api-helpers";
import { VOICE_TOOLS } from "@/lib/voice";

const ALLOWED = new Set<string>(VOICE_TOOLS.map((t) => t.name));

/**
 * Execute one CRM lookup on behalf of the live voice session.
 *
 * The Realtime model emits a function call over the browser's data channel;
 * the browser relays it here (still behind the app's auth), and we return the
 * result for it to hand back to the model. Read-only by design.
 */
export async function POST(request: Request) {
  let body: { name?: string; arguments?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const name = body.name;
  if (!name || !ALLOWED.has(name)) {
    return jsonError(`Unknown or disallowed tool: ${name ?? "(none)"}`, 400);
  }

  const db = await getDb();
  const brand = await getActiveBrandView();

  try {
    const result = await runAssistantTool(db, name, body.arguments ?? {}, brand);
    return NextResponse.json({ result });
  } catch (e) {
    return NextResponse.json({ result: { error: e instanceof Error ? e.message : "tool failed" } });
  }
}
