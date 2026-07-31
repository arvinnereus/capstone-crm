"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Milestone } from "@/lib/dashboard";

export function RevenueSettingsForm({
  initialStartDate,
  initialMilestones,
}: {
  initialStartDate: string;
  initialMilestones: Milestone[];
}) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(initialStartDate);
  const [milestones, setMilestones] = useState(
    initialMilestones.map((m) => ({ date: m.date, sgd: String(m.target_cents / 100) }))
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revenue_start_date: startDate,
          milestones: milestones
            .filter((m) => m.date && parseFloat(m.sgd) > 0)
            .map((m) => ({ date: m.date, target_cents: Math.round(parseFloat(m.sgd) * 100) })),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Revenue settings saved");
      router.refresh();
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid max-w-xs gap-2">
        <Label htmlFor="rs-start">Cumulative revenue counts from</Label>
        <Input id="rs-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label>Milestones (date · target SGD)</Label>
        {milestones.map((m, i) => (
          <div key={i} className="flex max-w-md gap-2">
            <Input
              type="date"
              value={m.date}
              onChange={(e) =>
                setMilestones((ms) => ms.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))
              }
            />
            <Input
              type="number"
              min="0"
              step="10000"
              value={m.sgd}
              onChange={(e) =>
                setMilestones((ms) => ms.map((x, j) => (j === i ? { ...x, sgd: e.target.value } : x)))
              }
            />
          </div>
        ))}
      </div>
      <Button onClick={save} disabled={saving} className="w-fit">
        {saving ? "Saving…" : "Save settings"}
      </Button>
    </div>
  );
}
