import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, BellRing } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FunnelSummary } from "@/components/dashboard/funnel-summary";
import { LeadsChart } from "@/components/dashboard/leads-chart";
import { RevenueHero } from "@/components/dashboard/revenue-hero";
import { StreamChart } from "@/components/dashboard/stream-chart";
import { TrafficChart } from "@/components/dashboard/traffic-chart";
import { getDashboardData } from "@/lib/dashboard";
import { getDb } from "@/lib/db";
import { formatDate, formatSGD } from "@/lib/format";

export const dynamic = "force-dynamic";

function PanelTitle({ title, href, hint }: { title: string; href: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <CardTitle className="text-sm">
        <Link href={href} className="hover:underline">
          {title}
        </Link>
      </CardTitle>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

export default async function CommandCenterPage() {
  const db = await getDb();
  const data = await getDashboardData(db);
  const { business, pipeline, marketing, website } = data;
  const net = business.month_income_cents - business.month_expense_cents;

  return (
    <div className="flex flex-col gap-4">
      {/* Hero: SGD 2M progress */}
      <Card>
        <CardContent className="pt-2">
          <RevenueHero
            cumulativeCents={business.cumulative_cents}
            targetCents={business.target_cents}
            revenueStartDate={business.revenue_start_date}
            milestones={business.milestones}
            monthlyCumulative={business.monthly_cumulative}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Panel A: Business Performance */}
        <Card>
          <CardHeader>
            <PanelTitle
              title="Business Performance"
              href="/finance"
              hint={
                business.finance_synced_at
                  ? `synced ${formatDate(business.finance_synced_at)}`
                  : "awaiting first finance sync"
              }
            />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Income this month</p>
                <p className="font-mono text-lg font-semibold tabular-nums text-success">
                  {formatSGD(business.month_income_cents)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expenses this month</p>
                <p className="font-mono text-lg font-semibold tabular-nums">
                  {formatSGD(business.month_expense_cents)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net</p>
                <p
                  className={`flex items-center gap-0.5 font-mono text-lg font-semibold tabular-nums ${
                    net >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {net >= 0 ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                  {formatSGD(Math.abs(net))}
                </p>
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Won revenue by stream</p>
              <StreamChart byStream={business.by_stream} />
            </div>
          </CardContent>
        </Card>

        {/* Panel B: Sales & Pipeline */}
        <Card>
          <CardHeader>
            <PanelTitle
              title="Sales & Pipeline"
              href="/pipeline"
              hint={pipeline.win_rate !== null ? `${pipeline.win_rate}% win rate` : undefined}
            />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Active deals</p>
                <p className="font-mono text-lg font-semibold tabular-nums">{pipeline.active_count}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Open pipeline</p>
                <p className="font-mono text-lg font-semibold tabular-nums">
                  {formatSGD(pipeline.open_value_cents)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Overdue follow-ups</p>
                {pipeline.overdue_count > 0 ? (
                  <Link href="/follow-ups">
                    <Badge variant="destructive" className="mt-1 gap-1">
                      <BellRing className="size-3" />
                      {pipeline.overdue_count}
                    </Badge>
                  </Link>
                ) : (
                  <p className="font-mono text-lg font-semibold tabular-nums text-success">0</p>
                )}
              </div>
            </div>
            <FunnelSummary byStage={pipeline.by_stage} />
          </CardContent>
        </Card>

        {/* Panel C: Marketing Awareness */}
        <Card>
          <CardHeader>
            <PanelTitle title="Marketing Awareness" href="/contacts" hint="last 8 weeks" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Abigail inquiries this week</p>
                <p className="font-mono text-lg font-semibold tabular-nums">
                  {marketing.abigail_this_week}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">New leads this week</p>
                <p className="font-mono text-lg font-semibold tabular-nums">{marketing.leads_this_week}</p>
              </div>
              <div className="rounded-md border border-dashed p-2">
                <p className="text-[10px] leading-tight text-muted-foreground">
                  LinkedIn &amp; social metrics
                  <br />
                  <span className="font-medium">Phase 2</span>
                </p>
              </div>
            </div>
            <LeadsChart weekly={marketing.weekly} />
          </CardContent>
        </Card>

        {/* Panel D: Website Performance */}
        <Card>
          <CardHeader>
            <PanelTitle
              title="Website Performance"
              href="/analytics"
              hint={
                website.synced_at
                  ? `synced ${formatDate(website.synced_at)}`
                  : "awaiting first analytics sync"
              }
            />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Visitors (7d)</p>
                <p className="font-mono text-lg font-semibold tabular-nums">
                  {website.visitors_7d.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Page views (7d)</p>
                <p className="font-mono text-lg font-semibold tabular-nums">
                  {website.page_views_7d.toLocaleString()}
                </p>
              </div>
            </div>
            <TrafficChart daily={website.daily} />
            {website.top_pages.length > 0 && (
              <div className="text-xs">
                <p className="mb-1 text-muted-foreground">Top pages (7d)</p>
                {website.top_pages.map((p) => (
                  <div key={p.path} className="flex justify-between gap-2 py-0.5">
                    <span className="truncate">{p.path}</span>
                    <span className="font-mono tabular-nums text-muted-foreground">{p.views}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
