"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CalendarClock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { STREAM_LABELS } from "@/lib/constants";
import { daysSince, formatSGDCompact, todaySG } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DealWithContact } from "@/lib/types";

export function DealCard({
  deal,
  onClick,
}: {
  deal: DealWithContact;
  onClick: (deal: DealWithContact) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
  });

  const open = deal.stage !== "won" && deal.stage !== "lost";
  const stale = open && daysSince(deal.stage_entered_at) > 14;
  const closePast =
    open && deal.expected_close_date !== null && deal.expected_close_date < todaySG();

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      onClick={() => !isDragging && onClick(deal)}
      className={cn(
        "cursor-pointer rounded-md border bg-card p-3 shadow-xs transition-colors hover:border-primary/40",
        isDragging && "z-50 opacity-80 shadow-lg"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-medium">{deal.name}</p>
        <span className="shrink-0 font-mono text-sm tabular-nums">
          {formatSGDCompact(
            deal.stage === "won" ? deal.final_value_cents ?? deal.value_cents : deal.value_cents
          )}
        </span>
      </div>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">
        {deal.contact_name}
        {deal.contact_company ? ` · ${deal.contact_company}` : ""}
      </p>
      <div className="mt-2 flex items-center gap-1.5">
        <Badge variant="secondary" className="text-[10px]">
          {STREAM_LABELS[deal.stream]}
        </Badge>
        {open && (
          <span
            className={cn(
              "text-[10px] text-muted-foreground",
              stale && "font-medium text-warning"
            )}
          >
            {daysSince(deal.stage_entered_at)}d in stage
          </span>
        )}
        {closePast && (
          <Badge variant="destructive" className="gap-0.5 text-[10px]">
            <CalendarClock className="size-2.5" />
            past close
          </Badge>
        )}
      </div>
    </div>
  );
}
