"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { STREAM_COLORS, STREAM_LABELS, type Stream } from "@/lib/constants";
import { BRANDS, type BrandId } from "@/lib/brands";
import { formatSGD, formatSGDCompact } from "@/lib/format";

const chartConfig = { cents: { label: "Won revenue" } } satisfies ChartConfig;

/** Group view: won revenue rolled up per brand. */
export function BrandRevenueChart({ byBrand }: { byBrand: { brand: BrandId; cents: number }[] }) {
  const rows = byBrand.filter((r) => r.cents > 0);
  if (rows.length === 0) {
    return (
      <p className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        No won deals yet — revenue by business appears here.
      </p>
    );
  }
  return (
    <RevenueBars
      data={rows.map((r) => ({
        name: BRANDS[r.brand]?.label ?? r.brand,
        cents: r.cents,
        fill: BRANDS[r.brand]?.color ?? "var(--chart-1)",
      }))}
    />
  );
}

export function StreamChart({ byStream }: { byStream: { stream: Stream; cents: number }[] }) {
  if (byStream.length === 0) {
    return (
      <p className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        No won deals yet — revenue by stream appears here.
      </p>
    );
  }

  return (
    <RevenueBars
      data={byStream.map((r) => ({
        name: STREAM_LABELS[r.stream],
        cents: r.cents,
        fill: STREAM_COLORS[r.stream],
      }))}
    />
  );
}

function RevenueBars({ data }: { data: { name: string; cents: number; fill: string }[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-40 w-full">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} fontSize={11} width={130} />
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
          radius={4}
          label={{
            position: "right",
            formatter: (v) => formatSGDCompact(Number(v)),
            fontSize: 10,
          }}
        />
      </BarChart>
    </ChartContainer>
  );
}
