import { getContentEnv } from "@/lib/content";

type Params = { params: Promise<{ key: string[] }> };

/**
 * Serves a generated illustration from the private R2 bucket. Protected by
 * the same global Basic Auth middleware as the rest of the app (no public
 * r2.dev subdomain) — no per-route auth check needed here.
 */
export async function GET(_request: Request, { params }: Params) {
  const { key } = await params;
  const objectKey = key.join("/");

  const { CONTENT_IMAGES } = await getContentEnv();
  const obj = await CONTENT_IMAGES.get(objectKey);
  if (!obj) return new Response("Not found", { status: 404 });

  return new Response(obj.body, {
    status: 200,
    headers: {
      "Content-Type": obj.httpMetadata?.contentType || "image/png",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
