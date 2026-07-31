"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { StageBadge } from "@/components/contacts/status-badges";
import { STREAM_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { DealWithContact } from "@/lib/types";

export function DealDrawer({
  deal,
  onClose,
}: {
  deal: DealWithContact | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [valueSGD, setValueSGD] = useState("");
  const [expectedClose, setExpectedClose] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (deal) {
      setName(deal.name);
      setValueSGD(String(deal.value_cents / 100));
      setExpectedClose(deal.expected_close_date ?? "");
      setNotes(deal.notes ?? "");
    }
  }, [deal]);

  if (!deal) return <Sheet open={false} onOpenChange={() => onClose()} />;

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/deals/${deal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || deal.name,
          value_cents: Math.round((parseFloat(valueSGD) || 0) * 100),
          expected_close_date: expectedClose || null,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Deal updated");
      onClose();
      router.refresh();
    } catch {
      toast.error("Failed to update deal");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const res = await fetch(`/api/deals/${deal.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Deal deleted");
      setDeleteOpen(false);
      onClose();
      router.refresh();
    } else {
      toast.error("Failed to delete deal");
    }
  };

  return (
    <>
      <Sheet open={true} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <SheetTitle className="flex-1">{deal.name}</SheetTitle>
              <StageBadge stage={deal.stage} />
            </div>
            <SheetDescription className="flex items-center gap-1">
              <Link href={`/contacts/${deal.contact_id}`} className="inline-flex items-center gap-1 hover:underline">
                {deal.contact_name}
                {deal.contact_company ? ` · ${deal.contact_company}` : ""}
                <ExternalLink className="size-3" />
              </Link>
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
            <p className="text-sm text-muted-foreground">
              {STREAM_LABELS[deal.stream]} · created {formatDate(deal.created_at)}
            </p>
            {deal.stage === "won" && (
              <p className="rounded-md border border-success/40 bg-success/10 p-2 text-sm text-success">
                Won {formatDate(deal.won_at)}
              </p>
            )}
            {deal.stage === "lost" && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
                Lost {formatDate(deal.lost_at)}
                {deal.lost_reason ? ` — ${deal.lost_reason}` : ""}
              </p>
            )}
            <div className="grid gap-2">
              <Label htmlFor="dd-name">Deal name</Label>
              <Input id="dd-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dd-value">Value (SGD)</Label>
                <Input
                  id="dd-value"
                  type="number"
                  min="0"
                  step="100"
                  value={valueSGD}
                  onChange={(e) => setValueSGD(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dd-close">Expected close</Label>
                <Input
                  id="dd-close"
                  type="date"
                  value={expectedClose}
                  onChange={(e) => setExpectedClose(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dd-notes">Notes</Label>
              <Textarea id="dd-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <SheetFooter className="flex-row justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this deal?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deal.name}” and its stage history will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
