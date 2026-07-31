import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrafficChart } from "@/components/dashboard/traffic-chart";
import { SyncButton } from "@/components/sync-button";
import { getDb } from "@/lib/db";
import { formatDate, todaySG } from "@/lib/format";

export const dynamic = "force-dynamic";

function daysAgo(n: number): string {
  const d = new Date(`${todaySG()}T00:00:00`);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default async function AnalyticsPage() {
  const db = await getDb();

  const [daily, topPages, referrers, lastSync] = await Promise.all([
    db
      .prepare("SELECT day, visitors, page_views FROM analytics_daily WHERE day >= ? ORDER BY day")
      .bind(daysAgo(30))
      .all<{ day: string; visitors: number; page_views: number }>(),
    db
      .prepare("SELECT path, SUM(views) AS views FROM analytics_pages GROUP BY path ORDER BY views DESC LIMIT 15")
      .all<{ path: string; views: number }>(),
    db
      .prepare(
        "SELECT referrer, SUM(visits) AS visits FROM analytics_referrers GROUP BY referrer ORDER BY visits DESC LIMIT 15"
      )
      .all<{ referrer: string; visits: number }>(),
    db
      .prepare(
        "SELECT finished_at, status, message FROM sync_log WHERE source = 'cf_analytics' ORDER BY started_at DESC LIMIT 1"
      )
      .first<{ finished_at: string | null; status: string; message: string | null }>(),
  ]);

  const last7 = daily.results.filter((r) => r.day >= daysAgo(7));
  const visitors7 = last7.reduce((sum, r) => sum + r.visitors, 0);
  const pageViews7 = last7.reduce((sum, r) => sum + r.page_views, 0);
  const visitors30 = daily.results.reduce((sum, r) => sum + r.visitors, 0);
  const pageViews30 = daily.results.reduce((sum, r) => sum + r.page_views, 0);
  const maxPage = Math.max(1, ...topPages.results.map((p) => p.views));
  const maxRef = Math.max(1, ...referrers.results.map((r) => r.visits));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Website Analytics</h2>
          <p className="text-sm text-muted-foreground">
            capstoneconsulting.com.sg · Cloudflare Web Analytics
            {lastSync?.finished_at && ` · last synced ${formatDate(lastSync.finished_at)}`}
            {lastSync?.status === "error" && (
              <span className="text-destructive"> · last sync failed: {lastSync.message}</span>
            )}
          </p>
        </div>
        <SyncButton endpoint="/api/analytics/sync" label="Sync analytics" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["Visitors (7d)", visitors7],
            ["Page views (7d)", pageViews7],
            ["Visitors (30d)", visitors30],
            ["Page views (30d)", pageViews30],
          ] as const
        ).map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle className="text-xs font-normal text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Traffic — last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          {daily.results.length === 0 ? (
            <p className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No analytics data yet. Click “Sync analytics” to pull from Cloudflare.
            </p>
          ) : (
            <TrafficChart daily={daily.results} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top pages (7-day window)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {topPages.results.length === 0 && (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            )}
            {topPages.results.map((p) => (
              <div key={p.path} className="grid grid-cols-[1fr_auto] items-center gap-2 text-xs">
                <div className="relative h-6 overflow-hidden rounded-sm bg-secondary">
                  <div
                    className="h-full rounded-sm bg-primary/20"
                    style={{ width: `${(p.views / maxPage) * 100}%` }}
                  />
                  <span className="absolute inset-y-0 left-2 flex items-center truncate">{p.path}</span>
                </div>
                <span className="font-mono tabular-nums text-muted-foreground">{p.views}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Referrers (7-day window)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {referrers.results.length === 0 && (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            )}
            {referrers.results.map((r) => (
              <div key={r.referrer} className="grid grid-cols-[1fr_auto] items-center gap-2 text-xs">
                <div className="relative h-6 overflow-hidden rounded-sm bg-secondary">
                  <div
                    className="h-full rounded-sm bg-chart-5/30"
                    style={{ width: `${(r.visits / maxRef) * 100}%` }}
                  />
                  <span className="absolute inset-y-0 left-2 flex items-center truncate">{r.referrer}</span>
                </div>
                <span className="font-mono tabular-nums text-muted-foreground">{r.visits}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
