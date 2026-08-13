import { NextResponse } from "next/server";

import { getActiveBrandView } from "@/lib/brand-context";
import { jsonError } from "@/lib/api-helpers";
import { VOICE_TOOLS, josephInstructions } from "@/lib/voice";

/**
 * Mint a short-lived OpenAI Realtime session token for the browser.
 *
 * The browser uses it to open a WebRTC connection straight to OpenAI, so
 * audio never passes through this Worker and the real OPENAI_API_KEY never
 * reaches the client.
 */
export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonError("Voice is not configured: OPENAI_API_KEY is missing (needs Realtime access).", 503);
  }

  const model = process.env.REALTIME_MODEL || "gpt-realtime";
  const voice = process.env.REALTIME_VOICE || "alloy";
  const brand = await getActiveBrandView();

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model,
          instructions: josephInstructions(brand),
          audio: {
            input: { transcription: { model: "whisper-1" } },
            output: { voice },
          },
          tools: VOICE_TOOLS,
        },
      }),
    });
  } catch (e) {
    return jsonError(`Could not reach OpenAI: ${e instanceof Error ? e.message : "network error"}`, 502);
  }

  if (!res.ok) {
    const detail = await res.text();
    return jsonError(`OpenAI rejected the voice session (${res.status}): ${detail.slice(0, 300)}`, 502);
  }

  const data = (await res.json()) as { value?: string; expires_at?: number; session?: { model?: string } };
  if (!data.value) return jsonError("OpenAI returned no session token", 502);

  return NextResponse.json({
    value: data.value,
    model: data.session?.model ?? model,
    expires_at: data.expires_at ?? null,
  });
}
