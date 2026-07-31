import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function parseBody<T>(
  request: Request,
  schema: ZodType<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { data: null, error: jsonError("Invalid JSON body") };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { data: null, error: jsonError(result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")) };
  }
  return { data: result.data, error: null };
}
