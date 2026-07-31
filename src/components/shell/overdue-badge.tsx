"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellRing } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function OverdueBadge() {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/follow-ups?status=overdue&count=1")
      .then((r) => (r.ok ? (r.json() as Promise<{ count?: number }>) : null))
      .then((data) => {
        if (!cancelled && data && typeof data.count === "number") setCount(data.count);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (count === 0) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href="/follow-ups" aria-label={`${count} overdue follow-ups`}>
          <Badge variant="destructive" className="gap-1">
            <BellRing className="size-3" />
            {count}
          </Badge>
        </Link>
      </TooltipTrigger>
      <TooltipContent>
        {count} overdue follow-up{count === 1 ? "" : "s"}
      </TooltipContent>
    </Tooltip>
  );
}
