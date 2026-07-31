"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  visitors: { label: "Visitors", color: "var(--chart-5)" },
  page_views: { label: "Page views", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function TrafficChart({
  daily,
}: {
  daily: { day: string; visitors: number; page_views: number }[];
}) {
  const data = daily.map((d) => ({ ...d, label: d.day.slice(5) }));

  return (
    <ChartContainer config={chartConfig} className="h-32 w-full">
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
        <CartesianGrid vertical={false} strokeOpacity={0.3} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} minTickGap={24} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          dataKey="page_views"
          type="monotone"
          fill="var(--color-page_views)"
          fillOpacity={0.1}
          stroke="var(--color-page_views)"
          strokeWidth={1.5}
        />
        <Area
          dataKey="visitors"
          type="monotone"
          fill="var(--color-visitors)"
          fillOpacity={0.2}
          stroke="var(--color-visitors)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
