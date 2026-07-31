"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";

import { CloseDealDialog, type CloseIntent } from "@/components/pipeline/close-deal-dialog";
import { DealCard } from "@/components/pipeline/deal-card";
import { DealDrawer } from "@/components/pipeline/deal-drawer";
import { STAGE_LABELS, STAGES, type Stage } from "@/lib/constants";
import { formatSGDCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DealWithContact } from "@/lib/types";

function StageColumn({
  stage,
  deals,
  onCardClick,
}: {
  stage: Stage;
  deals: DealWithContact[];
  onCardClick: (deal: DealWithContact) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = deals.reduce(
    (sum, d) => sum + (d.stage === "won" ? d.final_value_cents ?? d.value_cents : d.value_cents),
    0
  );

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-64 shrink-0 flex-col rounded-lg border bg-muted/40 transition-colors",
        isOver && "border-primary/60 bg-primary/5",
        stage === "won" && "border-success/30",
        stage === "lost" && "border-destructive/20"
      )}
    >
      <div className="flex items-baseline justify-between border-b px-3 py-2">
        <span className="text-sm font-semibold">{STAGE_LABELS[stage]}</span>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {deals.length} · {formatSGDCompact(total)}
        </span>
      </div>
      <div className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto p-2">
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} onClick={onCardClick} />
        ))}
      </div>
    </div>
  );
}

export function PipelineBoard({ initialDeals }: { initialDeals: DealWithContact[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [deals, setDeals] = useState(initialDeals);
  const [closeIntent, setCloseIntent] = useState<CloseIntent>(null);

  useEffect(() => setDeals(initialDeals), [initialDeals]);

  const openDealId = searchParams.get("deal");
  const openDeal = useMemo(
    () => deals.find((d) => d.id === openDealId) ?? null,
    [deals, openDealId]
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const byStage = useMemo(() => {
    const map = new Map<Stage, DealWithContact[]>(STAGES.map((s) => [s, []]));
    for (const deal of deals) map.get(deal.stage)?.push(deal);
    return map;
  }, [deals]);

  const setDealParam = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("deal", id);
    else params.delete("deal");
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const moveStage = async (
    deal: DealWithContact,
    toStage: Stage,
    payload: { final_value_cents?: number; lost_reason?: string } = {}
  ) => {
    const previous = deals;
    setDeals((ds) =>
      ds.map((d) =>
        d.id === deal.id
          ? {
              ...d,
              stage: toStage,
              stage_entered_at: new Date().toISOString(),
              final_value_cents:
                toStage === "won" ? payload.final_value_cents ?? d.value_cents : null,
              lost_reason: toStage === "lost" ? payload.lost_reason ?? null : null,
            }
          : d
      )
    );
    const res = await fetch(`/api/deals/${deal.id}/stage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to_stage: toStage, ...payload }),
    });
    if (!res.ok) {
      setDeals(previous);
      toast.error("Failed to move deal");
    } else {
      router.refresh();
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const toStage = over.id as Stage;
    const deal = deals.find((d) => d.id === active.id);
    if (!deal || deal.stage === toStage) return;

    if (toStage === "won" || toStage === "lost") {
      setCloseIntent({ deal, stage: toStage });
    } else {
      void moveStage(deal, toStage);
    }
  };

  return (
    <>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STAGES.map((stage) => (
            <StageColumn
              key={stage}
              stage={stage}
              deals={byStage.get(stage) ?? []}
              onCardClick={(deal) => setDealParam(deal.id)}
            />
          ))}
        </div>
      </DndContext>
      <CloseDealDialog
        intent={closeIntent}
        onCancel={() => setCloseIntent(null)}
        onConfirm={async (payload) => {
          if (closeIntent) await moveStage(closeIntent.deal, closeIntent.stage, payload);
          setCloseIntent(null);
        }}
      />
      <DealDrawer deal={openDeal} onClose={() => setDealParam(null)} />
    </>
  );
}
