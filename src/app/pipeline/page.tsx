import { Suspense } from "react";

import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { getDb } from "@/lib/db";
import { getActiveBrandView } from "@/lib/brand-context";
import { brandViewLabel } from "@/lib/brands";
import { OPEN_STAGES } from "@/lib/constants";
import { formatSGD } from "@/lib/format";
import { listDealsWithContacts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const db = await getDb();
  const brand = await getActiveBrandView();
  const deals = await listDealsWithContacts(db, brand);

  const open = deals.filter((d) => (OPEN_STAGES as string[]).includes(d.stage));
  const openValue = open.reduce((sum, d) => sum + d.value_cents, 0);
  const won = deals.filter((d) => d.stage === "won").length;
  const lost = deals.filter((d) => d.stage === "lost").length;
  const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <h2 className="text-lg font-semibold">Pipeline · {brandViewLabel(brand)}</h2>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono font-medium tabular-nums text-foreground">{open.length}</span> active deals ·{" "}
          <span className="font-mono font-medium tabular-nums text-foreground">{formatSGD(openValue)}</span> open
          {winRate !== null && (
            <>
              {" · "}
              <span className="font-mono font-medium tabular-nums text-foreground">{winRate}%</span> win rate
            </>
          )}
        </p>
      </div>
      <Suspense>
        <PipelineBoard initialDeals={deals} brand={brand} />
      </Suspense>
    </div>
  );
}
