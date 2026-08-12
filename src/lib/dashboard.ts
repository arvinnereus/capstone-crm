import { OPEN_STAGES, REVENUE_TARGET_CENTS, STAGES, type Stage, type Stream } from "@/lib/constants";
import type { BrandId, BrandView } from "@/lib/brands";
import { todaySG } from "@/lib/format";

export type Milestone = { date: string; target_cents: number };

export type DashboardData = {
  brand: BrandView;
  business: {
    cumulative_cents: number;
    target_cents: number;
    revenue_start_date: string;
    milestones: Milestone[];
    monthly_cumulative: { month: string; cents: number }[];
    by_stream: { stream: Stream; cents: number }[];
    /** Group view only: won revenue rolled up per brand. */
    by_brand: { brand: BrandId; cents: number }[];
    month_income_cents: number;
    month_expense_cents: number;
    finance_synced_at: string | null;
  };
  pipeline: {
    active_count: number;
    open_value_cents: number;
    by_stage: { stage: Stage; count: number; value_cents: number }[];
    overdue_count: number;
    win_rate: number | null;
  };
  marketing: {
    abigail_this_week: number;
    leads_this_week: number;
    weekly: { week: string; leads: number; abigail: number }[];
  };
  website: {
    visitors_7d: number;
    page_views_7d: number;
    daily: { day: string; visitors: number; page_views: number }[];
    top_pages: { path: string; views: number }[];
    referrers: { referrer: string; visits: number }[];
    synced_at: string | null;
  };
};

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function dateDaysAgo(days: number): string {
  const d = new Date(`${todaySG()}T00:00:00`);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function getDashboardData(
  db: D1Database,
  brand: BrandView = "group"
): Promise<DashboardData> {
  const today = todaySG();
  const thisMonth = today.slice(0, 7);
  const scoped = brand !== "group";
  // Interpolated fragments are fixed strings; the brand value itself is always bound.
  const brandCond = scoped ? "AND brand = ?" : "";
  const brandParams: string[] = scoped ? [brand] : [];

  const settingsRows = await db
    .prepare("SELECT key, value FROM settings WHERE key IN ('revenue_start_date','milestones')")
    .all<{ key: string; value: string }>();
  const settings = Object.fromEntries(settingsRows.results.map((r) => [r.key, r.value]));
  const revenueStart = settings.revenue_start_date ? (JSON.parse(settings.revenue_start_date) as string) : "2026-01-01";
  const milestones = settings.milestones ? (JSON.parse(settings.milestones) as Milestone[]) : [];

  const [
    monthlyIncome,
    monthTotals,
    streamRows,
    brandRows,
    dealRows,
    overdueRow,
    leadRows,
    analyticsDaily,
    topPages,
    referrers,
    financeSync,
    analyticsSync,
  ] = await Promise.all([
    db
      .prepare(
        `SELECT substr(txn_date, 1, 7) AS month, SUM(amount_cents) AS cents
         FROM finance_transactions WHERE kind = 'income' AND txn_date >= ? ${brandCond}
         GROUP BY month ORDER BY month`
      )
      .bind(revenueStart, ...brandParams)
      .all<{ month: string; cents: number }>(),
    db
      .prepare(
        `SELECT kind, SUM(amount_cents) AS cents FROM finance_transactions
         WHERE substr(txn_date, 1, 7) = ? ${brandCond} GROUP BY kind`
      )
      .bind(thisMonth, ...brandParams)
      .all<{ kind: string; cents: number }>(),
    db
      .prepare(
        `SELECT stream, SUM(COALESCE(final_value_cents, value_cents)) AS cents
         FROM deals WHERE stage = 'won' ${brandCond} GROUP BY stream ORDER BY cents DESC`
      )
      .bind(...brandParams)
      .all<{ stream: Stream; cents: number }>(),
    db
      .prepare(
        `SELECT brand, SUM(COALESCE(final_value_cents, value_cents)) AS cents
         FROM deals WHERE stage = 'won' GROUP BY brand ORDER BY cents DESC`
      )
      .all<{ brand: BrandId; cents: number }>(),
    db
      .prepare(
        `SELECT stage, COUNT(*) AS count, SUM(value_cents) AS value_cents FROM deals
         WHERE 1=1 ${brandCond} GROUP BY stage`
      )
      .bind(...brandParams)
      .all<{ stage: Stage; count: number; value_cents: number }>(),
    db
      .prepare(
        `SELECT COUNT(*) AS count FROM follow_ups f JOIN contacts c ON c.id = f.contact_id
         WHERE f.done = 0 AND f.due_date < ? ${scoped ? "AND c.brand = ?" : ""}`
      )
      .bind(today, ...brandParams)
      .first<{ count: number }>(),
    db
      .prepare(
        `SELECT lead_source, created_at FROM contacts WHERE created_at >= ? ${brandCond}`
      )
      .bind(isoDaysAgo(56), ...brandParams)
      .all<{ lead_source: string | null; created_at: string }>(),
    db
      .prepare("SELECT day, visitors, page_views FROM analytics_daily WHERE day >= ? ORDER BY day")
      .bind(dateDaysAgo(30))
      .all<{ day: string; visitors: number; page_views: number }>(),
    db
      .prepare(
        `SELECT path, SUM(views) AS views FROM analytics_pages WHERE day >= ?
         GROUP BY path ORDER BY views DESC LIMIT 5`
      )
      .bind(dateDaysAgo(7))
      .all<{ path: string; views: number }>(),
    db
      .prepare(
        `SELECT referrer, SUM(visits) AS visits FROM analytics_referrers WHERE day >= ?
         GROUP BY referrer ORDER BY visits DESC LIMIT 6`
      )
      .bind(dateDaysAgo(7))
      .all<{ referrer: string; visits: number }>(),
    db
      .prepare(
        "SELECT finished_at FROM sync_log WHERE source = 'sheets' AND status = 'ok' ORDER BY finished_at DESC LIMIT 1"
      )
      .first<{ finished_at: string }>(),
    db
      .prepare(
        "SELECT finished_at FROM sync_log WHERE source = 'cf_analytics' AND status = 'ok' ORDER BY finished_at DESC LIMIT 1"
      )
      .first<{ finished_at: string }>(),
  ]);

  // Cumulative revenue series by month
  let running = 0;
  const monthlyCumulative = monthlyIncome.results.map((r) => {
    running += r.cents ?? 0;
    return { month: r.month, cents: running };
  });
  const cumulative = running;

  const monthIncome = monthTotals.results.find((r) => r.kind === "income")?.cents ?? 0;
  const monthExpense = monthTotals.results.find((r) => r.kind === "expense")?.cents ?? 0;

  // Pipeline
  const byStageMap = new Map(dealRows.results.map((r) => [r.stage, r]));
  const byStage = STAGES.map((stage) => ({
    stage,
    count: byStageMap.get(stage)?.count ?? 0,
    value_cents: byStageMap.get(stage)?.value_cents ?? 0,
  }));
  const activeCount = OPEN_STAGES.reduce((sum, s) => sum + (byStageMap.get(s)?.count ?? 0), 0);
  const openValue = OPEN_STAGES.reduce((sum, s) => sum + (byStageMap.get(s)?.value_cents ?? 0), 0);
  const won = byStageMap.get("won")?.count ?? 0;
  const lost = byStageMap.get("lost")?.count ?? 0;
  const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null;

  // Marketing: 8 weekly buckets (oldest first)
  const weekly: { week: string; leads: number; abigail: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const start = new Date();
    start.setDate(start.getDate() - (i + 1) * 7);
    const end = new Date();
    end.setDate(end.getDate() - i * 7);
    const startISO = start.toISOString();
    const endISO = end.toISOString();
    const inWeek = leadRows.results.filter((r) => r.created_at >= startISO && r.created_at < endISO);
    weekly.push({
      week: end.toISOString().slice(5, 10),
      leads: inWeek.length,
      abigail: inWeek.filter((r) => r.lead_source === "abigail").length,
    });
  }
  const lastWeek = weekly[weekly.length - 1];

  // Website 7d totals
  const last7 = analyticsDaily.results.filter((r) => r.day >= dateDaysAgo(7));
  const visitors7 = last7.reduce((sum, r) => sum + r.visitors, 0);
  const pageViews7 = last7.reduce((sum, r) => sum + r.page_views, 0);

  return {
    brand,
    business: {
      cumulative_cents: cumulative,
      target_cents: milestones.length
        ? milestones[milestones.length - 1].target_cents
        : REVENUE_TARGET_CENTS,
      revenue_start_date: revenueStart,
      milestones,
      monthly_cumulative: monthlyCumulative,
      by_stream: streamRows.results,
      by_brand: brandRows.results,
      month_income_cents: monthIncome,
      month_expense_cents: monthExpense,
      finance_synced_at: financeSync?.finished_at ?? null,
    },
    pipeline: {
      active_count: activeCount,
      open_value_cents: openValue,
      by_stage: byStage,
      overdue_count: overdueRow?.count ?? 0,
      win_rate: winRate,
    },
    marketing: {
      abigail_this_week: lastWeek?.abigail ?? 0,
      leads_this_week: lastWeek?.leads ?? 0,
      weekly,
    },
    website: {
      visitors_7d: visitors7,
      page_views_7d: pageViews7,
      daily: analyticsDaily.results,
      top_pages: topPages.results,
      referrers: referrers.results,
      synced_at: analyticsSync?.finished_at ?? null,
    },
  };
}
