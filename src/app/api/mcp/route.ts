import { NextResponse } from "next/server";

import { ASSISTANT_TOOLS, runAssistantTool } from "@/lib/assistant";
import { getDb } from "@/lib/db";

/**
 * Capstone CRM — remote MCP server (stateless Streamable HTTP).
 *
 * Lets Claude Code on Caleb, Cowork on Solomon, and claude.ai query the CRM
 * directly, so desk-side AI runs on the Max subscription instead of the app
 * paying per token. Every request is self-contained — no session, no Durable
 * Object — which is Cloudflare's current recommended shape for remote MCP.
 *
 * Auth is a bearer token (MCP_TOKEN), separate from the app's Basic Auth so it
 * can be rotated without changing the login. Excluded from the auth middleware.
 *
 * Read-only: it exposes exactly the four tools Joseph uses, nothing that writes.
 */

const SERVER_INFO = { name: "capstone-crm", version: "1.0.0" };
const SUPPORTED_PROTOCOLS = ["2026-07-28", "2025-06-18", "2025-03-26", "2024-11-05"];
const FALLBACK_PROTOCOL = "2025-06-18";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version",
};

type RpcRequest = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };

function result(id: string | number | null | undefined, value: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, result: value }, { headers: CORS });
}

function rpcError(id: string | number | null | undefined, code: number, message: string, status = 200) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, { status, headers: CORS });
}

/** MCP tools use `inputSchema`; our shared layer stores the OpenAI function shape. */
const MCP_TOOLS = ASSISTANT_TOOLS.map((t) => ({
  name: t.function.name,
  description: t.function.description,
  inputSchema: t.function.parameters,
}));

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET() {
  // Stateless server: no standalone SSE listen stream to open.
  return NextResponse.json(
    { error: "This MCP server is stateless — use POST for JSON-RPC." },
    { status: 405, headers: { ...CORS, Allow: "POST, OPTIONS" } }
  );
}

export async function POST(request: Request) {
  const token = process.env.MCP_TOKEN;
  if (!token) {
    return rpcError(null, -32603, "MCP server not configured: MCP_TOKEN is missing", 503);
  }
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${token}`) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Unauthorized" } },
      { status: 401, headers: { ...CORS, "WWW-Authenticate": "Bearer" } }
    );
  }

  let body: RpcRequest | RpcRequest[];
  try {
    body = await request.json();
  } catch {
    return rpcError(null, -32700, "Parse error");
  }

  // Batches are legal JSON-RPC; handle the common single-message case plus arrays.
  const messages = Array.isArray(body) ? body : [body];
  const responses = [];
  for (const msg of messages) {
    const res = await handle(msg);
    if (res) responses.push(res);
  }

  // Every message was a notification — nothing to return.
  if (responses.length === 0) return new NextResponse(null, { status: 202, headers: CORS });
  if (!Array.isArray(body)) {
    const only = responses[0];
    return NextResponse.json(only, { status: only.error?.code === -32601 ? 200 : 200, headers: CORS });
  }
  return NextResponse.json(responses, { headers: CORS });
}

type RpcResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string };
};

async function handle(msg: RpcRequest): Promise<RpcResponse | null> {
  const id = msg.id ?? null;
  const isNotification = msg.id === undefined || msg.id === null;
  const method = msg.method ?? "";

  // Notifications get no response body at all.
  if (method.startsWith("notifications/")) return null;

  if (method === "initialize") {
    const asked = String((msg.params as { protocolVersion?: string } | undefined)?.protocolVersion ?? "");
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: SUPPORTED_PROTOCOLS.includes(asked) ? asked : FALLBACK_PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          "Live read-only access to the Capstone Command Center CRM, covering three businesses: " +
          "Capstone Consulting, Hatch Studio and Capstone AI Lab. Pass `brand` as consulting, hatch, " +
          "ailab, or group (all three) — it defaults to group. Money is returned in whole SGD.",
      },
    };
  }

  if (method === "ping") return { jsonrpc: "2.0", id, result: {} };

  if (method === "tools/list") {
    return { jsonrpc: "2.0", id, result: { tools: MCP_TOOLS } };
  }

  if (method === "tools/call") {
    const params = (msg.params ?? {}) as { name?: string; arguments?: Record<string, unknown> };
    const name = params.name ?? "";
    if (!MCP_TOOLS.some((t) => t.name === name)) {
      return { jsonrpc: "2.0", id, error: { code: -32602, message: `Unknown tool: ${name}` } };
    }
    try {
      const db = await getDb();
      const data = await runAssistantTool(db, name, params.arguments ?? {}, "group");
      return {
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] },
      };
    } catch (e) {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          isError: true,
          content: [{ type: "text", text: `Tool failed: ${e instanceof Error ? e.message : "unknown error"}` }],
        },
      };
    }
  }

  if (isNotification) return null;
  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
}
