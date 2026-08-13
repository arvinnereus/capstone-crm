import { NextResponse } from "next/server";

import { ASSISTANT_TOOLS, assistantSystemPrompt, runAssistantTool } from "@/lib/assistant";
import { getActiveBrandView } from "@/lib/brand-context";
import { getDb } from "@/lib/db";
import { jsonError } from "@/lib/api-helpers";

const MODEL = process.env.ASSISTANT_MODEL || "anthropic/claude-sonnet-5";
const MAX_TOOL_ROUNDS = 6;

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return jsonError("Assistant not configured: OPENROUTER_API_KEY missing", 503);

  let body: { messages?: { role: string; content: string }[] };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const history = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20);
  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return jsonError("Last message must be from the user", 400);
  }

  const db = await getDb();
  const brand = await getActiveBrandView();

  const messages: ChatMessage[] = [
    { role: "system", content: assistantSystemPrompt(brand) },
    ...(history as ChatMessage[]),
  ];

  const toolsUsed: string[] = [];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://crm.capstoneconsulting.com.sg",
        "X-Title": "Capstone Command Center",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        tools: round < MAX_TOOL_ROUNDS ? ASSISTANT_TOOLS : undefined,
        max_tokens: 1500,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return jsonError(`Model request failed (${res.status}): ${detail.slice(0, 300)}`, 502);
    }

    const data = (await res.json()) as {
      choices?: { message?: ChatMessage & { content?: string | null } }[];
    };
    const msg = data.choices?.[0]?.message;
    if (!msg) return jsonError("Empty model response", 502);

    if (msg.tool_calls?.length) {
      messages.push({ role: "assistant", content: msg.content ?? null, tool_calls: msg.tool_calls });
      for (const call of msg.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          // leave args empty on malformed arguments
        }
        toolsUsed.push(call.function.name);
        let result: unknown;
        try {
          result = await runAssistantTool(db, call.function.name, args, brand);
        } catch (e) {
          result = { error: e instanceof Error ? e.message : "tool failed" };
        }
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
      continue;
    }

    return NextResponse.json({ reply: msg.content ?? "", tools_used: toolsUsed });
  }

  return jsonError("Assistant exceeded tool budget without answering", 502);
}
