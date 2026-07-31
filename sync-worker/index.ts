import { syncAnalytics, syncSheets } from "../src/lib/sync-core";

type Env = {
  DB: D1Database;
  SHEETS_SERVICE_ACCOUNT: string;
  INCOME_SHEET_ID: string;
  EXPENSES_SHEET_ID: string;
  CF_ANALYTICS_TOKEN: string;
  CF_ACCOUNT_ID: string;
  CF_SITE_TAG: string;
};

export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      Promise.allSettled([
        syncSheets(env.DB, env.SHEETS_SERVICE_ACCOUNT, {
          income: env.INCOME_SHEET_ID,
          expenses: env.EXPENSES_SHEET_ID,
        }),
        syncAnalytics(env.DB, env.CF_ANALYTICS_TOKEN, env.CF_ACCOUNT_ID, env.CF_SITE_TAG),
      ])
    );
  },
} satisfies ExportedHandler<Env>;
