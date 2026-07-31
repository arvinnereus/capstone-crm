"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ContentJobRow, ContentShotRow } from "@/lib/types";

const TERMINAL_JOB_STATUSES = new Set(["done", "failed"]);

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  drafting: "secondary",
  drafted: "secondary",
  pending: "secondary",
  generating: "secondary",
  done: "default",
  failed: "destructive",
};

export function JobDetailView({
  initialJob,
  initialShots,
}: {
  initialJob: ContentJobRow;
  initialShots: ContentShotRow[];
}) {
  const [job, setJob] = useState(initialJob);
  const [shots, setShots] = useState(initialShots);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollOnce = async () => {
    try {
      const res = await fetch(`/api/content/${initialJob.id}`);
      if (!res.ok) return;
      const data = (await res.json()) as { job: ContentJobRow; shots: ContentShotRow[] };
      setJob(data.job);
      setShots(data.shots);
      if (TERMINAL_JOB_STATUSES.has(data.job.status) && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } catch {
      // transient network error — next tick retries
    }
  };

  const ensurePolling = () => {
    if (!timerRef.current) timerRef.current = setInterval(pollOnce, 4000);
  };

  useEffect(() => {
    if (!TERMINAL_JOB_STATUSES.has(job.status)) ensurePolling();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialJob.id]);

  const retry = async (shotId: string) => {
    try {
      const res = await fetch(`/api/content/${job.id}/shots/${shotId}/retry`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Retry failed");
      }
      toast.success("Retrying…");
      ensurePolling();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Retry failed");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{job.article_title || "(untitled article)"}</h2>
        <Badge variant={STATUS_VARIANT[job.status] ?? "outline"}>{job.status}</Badge>
      </div>
      {job.core_argument && <p className="text-sm text-muted-foreground">{job.core_argument}</p>}
      {job.error && <p className="text-sm text-destructive">{job.error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shots.map((shot) => (
          <Card key={shot.id} className="overflow-hidden py-0">
            <div className="flex aspect-video items-center justify-center bg-muted">
              {shot.status === "done" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/content/image/jobs/${shot.job_id}/${shot.id}.png`}
                  alt={shot.theme ?? ""}
                  className="size-full object-cover"
                />
              ) : shot.status === "failed" ? (
                <span className="text-2xl">⚠</span>
              ) : (
                <span className="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
              )}
            </div>
            <CardContent className="flex flex-col gap-2 py-4">
              <p className="line-clamp-2 text-sm font-medium">{shot.theme || `Shot ${shot.shot_index + 1}`}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={STATUS_VARIANT[shot.status] ?? "outline"}>{shot.status}</Badge>
                {shot.structure_type && <Badge variant="outline">{shot.structure_type}</Badge>}
              </div>
              {shot.status === "failed" && (
                <>
                  {shot.error && <p className="text-xs text-destructive">{shot.error}</p>}
                  <Button size="sm" variant="outline" onClick={() => retry(shot.id)}>
                    Retry
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
