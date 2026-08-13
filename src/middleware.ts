import { NextResponse, type NextRequest } from "next/server";

/**
 * Interim auth gate until Cloudflare Access is configured (the build token
 * lacked Access scopes). Single shared credential over HTTPS, checked at the
 * edge for every page and API route. Remove once Access fronts the hostname.
 */
export function middleware(request: NextRequest) {
  // Public ingest endpoint — allow through without auth
  if (request.url.includes('/api/ingest')) return NextResponse.next();
  // MCP server carries its own bearer-token auth (MCP_TOKEN) so it can be
  // rotated independently of the login; Basic Auth would break MCP clients.
  if (request.url.includes('/api/mcp')) return NextResponse.next();

  const expected = process.env.CRM_PASSWORD;
  if (!expected) return NextResponse.next(); // not configured (local dev)
  const expectedUser = process.env.CRM_USERNAME || "arvin";

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      const [user, ...rest] = atob(auth.slice(6)).split(":");
      if (user === expectedUser && rest.join(":") === expected) return NextResponse.next();
    } catch {
      // fall through to challenge
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Capstone Command Center"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg|api/ingest|api/mcp).*)"],
};
