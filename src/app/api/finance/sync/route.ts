import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { jsonError } from "@/lib/api-helpers";
import { syncSheets } from "@/lib/sync-core";

type SyncEnv = {
  SHEETS_SERVICE_ACCOUNT?: string;
  INCOME_SHEET_ID?: string;
  EXPENSES_SHEET_ID?: string;
};

export async function POST() {
  const { env } = await getCloudflareContext({ async: true });
  const { SHEETS_SERVICE_ACCOUNT, INCOME_SHEET_ID, EXPENSES_SHEET_ID } = env as unknown as SyncEnv;
  if (!SHEETS_SERVICE_ACCOUNT) return jsonError("SHEETS_SERVICE_ACCOUNT secret not configured", 500);
  if (!INCOME_SHEET_ID || !EXPENSES_SHEET_ID) {
    return jsonError("INCOME_SHEET_ID / EXPENSES_SHEET_ID secrets not configured", 500);
  }

  const result = await syncSheets(env.DB, SHEETS_SERVICE_ACCOUNT, {
    income: INCOME_SHEET_ID,
    expenses: EXPENSES_SHEET_ID,
  });
  if (!result.ok) return jsonError(result.message, 502);
  return NextResponse.json(result);
}
