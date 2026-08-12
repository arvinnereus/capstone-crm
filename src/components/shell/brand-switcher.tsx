"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Building2 } from "lucide-react";

import { BRAND_LIST, brandViewLabel, type BrandView } from "@/lib/brands";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function BrandDot({ color }: { color: string }) {
  return <span className="size-2 shrink-0 rounded-full" style={{ background: color }} />;
}

export function BrandSwitcher({ active }: { active: BrandView }) {
  const router = useRouter();
  const [value, setValue] = useState<BrandView>(active);
  const [, startTransition] = useTransition();

  function onChange(next: string) {
    const view = next as BrandView;
    setValue(view);
    startTransition(async () => {
      await fetch("/api/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: view }),
      });
      router.refresh();
    });
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className="h-9 w-full border-sidebar-border bg-sidebar-accent/40 text-xs font-medium group-data-[collapsible=icon]:hidden"
        aria-label="Active business"
      >
        <SelectValue>{brandViewLabel(value)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="group">
          <span className="flex items-center gap-2">
            <Building2 className="size-3.5 text-muted-foreground" />
            Group View
          </span>
        </SelectItem>
        {BRAND_LIST.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            <span className="flex items-center gap-2">
              <BrandDot color={b.color} />
              {b.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
