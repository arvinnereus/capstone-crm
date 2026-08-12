import { NextResponse } from "next/server";

import { BRAND_COOKIE, parseBrandView } from "@/lib/brands";

export async function POST(request: Request) {
  let body: { brand?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const view = parseBrandView(body.brand);
  const res = NextResponse.json({ brand: view });
  res.cookies.set(BRAND_COOKIE, view, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}
