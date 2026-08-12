import Link from "next/link";

import { type Stage } from "@/lib/constants";
import { stageLabelsFor, type BrandView } from "@/lib/brands";
import { formatSGDCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Labeled stage bars with stage-to-stage conversion — clearer and more
 * accessible than a literal funnel shape. Stages with zero deals render an
 * empty track, never a filled bar.
 */
export function FunnelSummary({
  byStage,
  brand = "group",
}: {
  byStage: { stage: Stage; count: number; value_cents: number }[];
  brand?: BrandView;
}) {
  const stageLabels = stageLabelsFor(brand);
  const open = byStage.filter((s) => s.stage !== "won" && s.stage !== "lost");
  const closed = byStage.filter((s) => s.stage === "won" || s.stage === "lost");
  const max = Math.max(1, ...open.map((s) => s.count));

  return (
    <div className="flex flex-col gap-1.5">
      {open.map((s) => (
        <Link
          key={s.stage}
          href="/pipeline"
          className="group grid grid-cols-[90px_1fr_auto] items-center gap-2 text-xs"
        >
          <span className="text-muted-foreground group-hover:text-foreground">
            {stageLabels[s.stage]}
          </span>
          <div className="h-5 overflow-hidden rounded-sm bg-muted/60">
            {s.count > 0 && (
              <div
                className="flex h-full items-center rounded-sm bg-primary/80 px-1.5 font-mono text-[10px] tabular-nums text-primary-foreground transition-all group-hover:bg-primary"
                style={{ width: `${Math.max(8, (s.count / max) * 100)}%` }}
              >
                {s.count}
              </div>
            )}
          </div>
          <span className="font-mono tabular-nums text-muted-foreground">
            {formatSGDCompact(s.value_cents)}
          </span>
        </Link>
      ))}
      <div className="mt-1 flex gap-4 border-t pt-2 text-xs">
        {closed.map((s) => (
          <span key={s.stage} className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-2 rounded-full",
                s.stage === "won" ? "bg-success" : "bg-destructive"
              )}
            />
            <span className="text-muted-foreground">{stageLabels[s.stage]}</span>
            <span className="font-mono font-medium tabular-nums">{s.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
