"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DealWithContact } from "@/lib/types";

export type CloseIntent = { deal: DealWithContact; stage: "won" | "lost" } | null;

export function CloseDealDialog({
  intent,
  onCancel,
  onConfirm,
}: {
  intent: CloseIntent;
  onCancel: () => void;
  onConfirm: (payload: { final_value_cents?: number; lost_reason?: string }) => Promise<void>;
}) {
  const [finalValue, setFinalValue] = useState<string>("");
  const [lostReason, setLostReason] = useState("");
  const [saving, setSaving] = useState(false);

  const open = intent !== null;
  const isWon = intent?.stage === "won";

  const confirm = async () => {
    setSaving(true);
    try {
      await onConfirm(
        isWon
          ? {
              final_value_cents: finalValue
                ? Math.round(parseFloat(finalValue) * 100)
                : undefined,
            }
          : { lost_reason: lostReason.trim() || undefined }
      );
      setFinalValue("");
      setLostReason("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isWon ? "Mark deal as Won 🎉" : "Mark deal as Lost"}</DialogTitle>
          <DialogDescription>{intent?.deal.name}</DialogDescription>
        </DialogHeader>
        {isWon ? (
          <div className="grid gap-2 py-2">
            <Label htmlFor="cd-value">Final value (SGD)</Label>
            <Input
              id="cd-value"
              type="number"
              min="0"
              step="100"
              placeholder={intent ? String(intent.deal.value_cents / 100) : "0"}
              value={finalValue}
              onChange={(e) => setFinalValue(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to keep the current deal value. Won value feeds the revenue-by-stream chart.
            </p>
          </div>
        ) : (
          <div className="grid gap-2 py-2">
            <Label htmlFor="cd-reason">Reason</Label>
            <Textarea
              id="cd-reason"
              rows={3}
              placeholder="Why was this lost? (budget, timing, competitor…)"
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={confirm}
            disabled={saving}
            className={isWon ? "" : "bg-destructive text-white hover:bg-destructive/90"}
          >
            {saving ? "Saving…" : isWon ? "Confirm won" : "Confirm lost"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
