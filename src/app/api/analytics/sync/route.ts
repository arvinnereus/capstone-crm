import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { jsonError } from "@/lib/api-helpers";
import { syncAnalytics } from "@/lib/sync-core";

export async function POST() {
  const { env } = await getCloudflareContext({ async: true });
  const typed = env as unknown as {
    CF_ANALYTICS_TOKEN?: string;
    CF_ACCOUNT_ID: string;
    CF_SITE_TAG: string;
  };
  if (!typed.CF_ANALYTICS_TOKEN) return jsonError("CF_ANALYTICS_TOKEN secret not configured", 500);

  const result = await syncAnalytics(env.DB, typed.CF_ANALYTICS_TOKEN, typed.CF_ACCOUNT_ID, typed.CF_SITE_TAG);
  if (!result.ok) return jsonError(result.message, 502);
  return NextResponse.json(result);
}
