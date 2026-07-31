import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RevenueSettingsForm } from "@/components/settings/revenue-settings-form";
import { SyncButton } from "@/components/sync-button";
import { getDb } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import type { Milestone } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const db = await getDb();

  const [settingsRows, syncRows] = await Promise.all([
    db
      .prepare("SELECT key, value FROM settings WHERE key IN ('revenue_start_date','milestones')")
      .all<{ key: string; value: string }>(),
    db
      .prepare("SELECT * FROM sync_log ORDER BY started_at DESC LIMIT 10")
      .all<{ id: string; source: string; started_at: string; finished_at: string | null; status: string; message: string | null }>(),
  ]);

  const settings = Object.fromEntries(settingsRows.results.map((r) => [r.key, JSON.parse(r.value)]));
  const startDate = (settings.revenue_start_date as string) ?? "2026-01-01";
  const milestones = (settings.milestones as Milestone[]) ?? [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <h2 className="text-lg font-semibold">Settings</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Data sources</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Finance Tracker (Google Sheets)</p>
              <p className="text-xs text-muted-foreground">Read-only · auto-syncs hourly</p>
            </div>
            <SyncButton endpoint="/api/finance/sync" label="Sync now" />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Cloudflare Web Analytics</p>
              <p className="text-xs text-muted-foreground">capstoneconsulting.com.sg · auto-syncs hourly</p>
            </div>
            <SyncButton endpoint="/api/analytics/sync" label="Sync now" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Revenue goal</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueSettingsForm initialStartDate={startDate} initialMilestones={milestones} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent syncs</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          {syncRows.results.length === 0 && (
            <p className="text-sm text-muted-foreground">No syncs yet.</p>
          )}
          {syncRows.results.map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-xs">
              <Badge
                variant={s.status === "ok" ? "outline" : s.status === "error" ? "destructive" : "secondary"}
                className={s.status === "ok" ? "border-success/50 text-success" : ""}
              >
                {s.status}
              </Badge>
              <span className="font-medium">{s.source === "sheets" ? "Sheets" : "Analytics"}</span>
              <span className="text-muted-foreground">{formatDateTime(s.started_at)}</span>
              <span className="truncate text-muted-foreground">{s.message}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
