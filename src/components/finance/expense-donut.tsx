"use client";

import { Cell, Pie, PieChart } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatSGD } from "@/lib/format";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

export function ExpenseDonut({ byCategory }: { byCategory: { category: string; cents: number }[] }) {
  if (byCategory.length === 0) {
    return (
      <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        No expense data yet.
      </p>
    );
  }

  // Largest first; cap at 6 slices, fold the rest into "Other"
  const sorted = [...byCategory].sort((a, b) => b.cents - a.cents);
  const top = sorted.slice(0, 5);
  const rest = sorted.slice(5);
  const data = [
    ...top,
    ...(rest.length > 0
      ? [{ category: "Other", cents: rest.reduce((sum, r) => sum + r.cents, 0) }]
      : []),
  ].map((r, i) => ({ name: r.category || "Uncategorised", value: r.cents, fill: COLORS[i % COLORS.length] }));

  const config = Object.fromEntries(
    data.map((d) => [d.name, { label: d.name, color: d.fill }])
  ) satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="mx-auto h-56 w-full">
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, name) => (
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="text-muted-foreground">{name}</span>
                  <span className="font-mono tabular-nums">{formatSGD(Number(value))}</span>
                </span>
              )}
            />
          }
        />
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} strokeWidth={2}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="name" />} className="flex-wrap" />
      </PieChart>
    </ChartContainer>
  );
}
