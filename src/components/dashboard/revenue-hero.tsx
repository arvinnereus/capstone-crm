"use client";

import { Area, AreaChart, CartesianGrid, Line, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatSGD, formatSGDCompact } from "@/lib/format";
import type { Milestone } from "@/lib/dashboard";

const chartConfig = {
  actual: { label: "Actual", color: "var(--chart-1)" },
  target: { label: "Milestone", color: "var(--chart-6)" },
} satisfies ChartConfig;

export function RevenueHero({
  cumulativeCents,
  targetCents,
  revenueStartDate,
  milestones,
  monthlyCumulative,
}: {
  cumulativeCents: number;
  targetCents: number;
  revenueStartDate: string;
  milestones: Milestone[];
  monthlyCumulative: { month: string; cents: number }[];
}) {
  const pct = targetCents > 0 ? Math.min(100, (cumulativeCents / targetCents) * 100) : 0;

  // Merge actual months and milestone targets into one series keyed by YYYY-MM
  const points = new Map<string, { month: string; actual?: number; target?: number }>();
  const touch = (month: string) => {
    if (!points.has(month)) points.set(month, { month });
    return points.get(month)!;
  };
  touch(revenueStartDate.slice(0, 7)).target = 0;
  for (const m of monthlyCumulative) touch(m.month).actual = m.cents / 100;
  for (const ms of milestones) touch(ms.date.slice(0, 7)).target = ms.target_cents / 100;
  const series = [...points.values()].sort((a, b) => (a.month < b.month ? -1 : 1));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="flex flex-col justify-center gap-3">
        <p className="text-sm text-muted-foreground">Cumulative revenue since {revenueStartDate}</p>
        <p className="font-mono text-4xl font-semibold tabular-nums tracking-tight">
          {formatSGD(cumulativeCents)}
        </p>
        <div>
          <div className="relative h-3 w-full overflow-hidden rounded-sm border border-[oklch(0.30_0.06_195)] bg-[oklch(0.14_0.04_200)] dark:bg-[oklch(0.14_0.04_200)]">
            <div
              className="h-full transition-all"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg, oklch(0.55 0.19 192), oklch(0.82 0.19 192))",
                boxShadow: "0 0 12px oklch(0.73 0.19 192 / 0.7), 0 0 4px oklch(0.73 0.19 192)",
              }}
            />
            {milestones.map((m) => (
              <div
                key={m.date}
                className="absolute top-0 h-full w-0.5 bg-foreground/30"
                style={{ left: `${Math.min(100, (m.target_cents / targetCents) * 100)}%` }}
                title={`${formatSGDCompact(m.target_cents)} by ${m.date}`}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span className="font-mono tabular-nums">{pct.toFixed(1)}%</span>
            <span className="font-mono tabular-nums">{formatSGDCompact(targetCents)} target</span>
          </div>
        </div>
      </div>
      <ChartContainer config={chartConfig} className="h-44 w-full">
        <AreaChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid vertical={false} strokeOpacity={0.3} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
          <YAxis
            tickFormatter={(v: number) => formatSGDCompact(v * 100)}
            tickLine={false}
            axisLine={false}
            fontSize={11}
            width={52}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => (
                  <span className="flex w-full items-center justify-between gap-3">
                    <span className="text-muted-foreground">
                      {chartConfig[name as keyof typeof chartConfig]?.label ?? name}
                    </span>
                    <span className="font-mono tabular-nums">{formatSGD(Number(value) * 100)}</span>
                  </span>
                )}
              />
            }
          />
          <Area
            dataKey="actual"
            type="monotone"
            fill="var(--color-actual)"
            fillOpacity={0.2}
            stroke="var(--color-actual)"
            strokeWidth={2}
            connectNulls
          />
          <Line
            dataKey="target"
            type="linear"
            stroke="var(--color-target)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={{ r: 3 }}
            connectNulls
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
