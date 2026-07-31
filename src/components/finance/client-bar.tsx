"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatSGD, formatSGDCompact } from "@/lib/format";

const chartConfig = { cents: { label: "Income", color: "var(--chart-1)" } } satisfies ChartConfig;

export function ClientBar({ byClient }: { byClient: { client: string; cents: number }[] }) {
  if (byClient.length === 0) {
    return (
      <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        No income data yet.
      </p>
    );
  }

  const data = byClient.map((r) => ({ name: r.client || "Unknown", cents: r.cents }));

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height: Math.max(160, data.length * 32) }}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 8 }}>
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} fontSize={11} width={140} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, _name, item) => (
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="text-muted-foreground">{item?.payload?.name}</span>
                  <span className="font-mono tabular-nums">{formatSGD(Number(value))}</span>
                </span>
              )}
            />
          }
        />
        <Bar
          dataKey="cents"
          fill="var(--color-cents)"
          radius={4}
          label={{ position: "right", formatter: (v) => formatSGDCompact(Number(v)), fontSize: 10 }}
        />
      </BarChart>
    </ChartContainer>
  );
}
