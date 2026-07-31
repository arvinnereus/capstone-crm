"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  leads: { label: "All leads", color: "var(--chart-1)" },
  abigail: { label: "Abigail", color: "var(--chart-4)" },
} satisfies ChartConfig;

export function LeadsChart({
  weekly,
}: {
  weekly: { week: string; leads: number; abigail: number }[];
}) {
  return (
    <ChartContainer config={chartConfig} className="h-32 w-full">
      <AreaChart data={weekly} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
        <CartesianGrid vertical={false} strokeOpacity={0.3} />
        <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={10} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          dataKey="leads"
          type="monotone"
          fill="var(--color-leads)"
          fillOpacity={0.15}
          stroke="var(--color-leads)"
          strokeWidth={2}
        />
        <Area
          dataKey="abigail"
          type="monotone"
          fill="var(--color-abigail)"
          fillOpacity={0.2}
          stroke="var(--color-abigail)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
