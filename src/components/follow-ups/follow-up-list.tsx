"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { relativeDays, todaySG } from "@/lib/format";
import type { FollowUpWithContext } from "@/lib/types";

function SnoozeButton({ followUp, onDone }: { followUp: FollowUpWithContext; onDone: () => void }) {
  const snooze = async (days: number) => {
    const base = new Date(`${todaySG()}T00:00:00`);
    base.setDate(base.getDate() + days);
    const due = base.toISOString().slice(0, 10);
    const res = await fetch(`/api/follow-ups/${followUp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ due_date: due }),
    });
    if (res.ok) {
      toast.success(`Snoozed to ${due}`);
      onDone();
    } else {
      toast.error("Failed to snooze");
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => snooze(1)}>
        +1d
      </Button>
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => snooze(7)}>
        +1w
      </Button>
    </div>
  );
}

export function FollowUpList({
  followUps,
  showContact = true,
  contactId,
  dealId,
}: {
  followUps: FollowUpWithContext[];
  showContact?: boolean;
  /** When set, shows an inline "add follow-up" row for this contact. */
  contactId?: string;
  dealId?: string;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [action, setAction] = useState("");
  const [due, setDue] = useState(todaySG());
  const today = todaySG();

  const toggle = async (fu: FollowUpWithContext, done: boolean) => {
    const res = await fetch(`/api/follow-ups/${fu.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    });
    if (res.ok) {
      if (done) toast.success("Marked done — set the next action to keep momentum");
      router.refresh();
    } else {
      toast.error("Failed to update follow-up");
    }
  };

  const add = async () => {
    if (!contactId || !action.trim() || !due) return;
    const res = await fetch("/api/follow-ups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_id: contactId, deal_id: dealId ?? null, action: action.trim(), due_date: due }),
    });
    if (res.ok) {
      toast.success("Follow-up added");
      setAction("");
      setDue(todaySG());
      setAdding(false);
      router.refresh();
    } else {
      toast.error("Failed to add follow-up");
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {followUps.length === 0 && !adding && (
        <p className="py-2 text-sm text-muted-foreground">No pending follow-ups.</p>
      )}
      {followUps.map((fu) => {
        const overdue = fu.done === 0 && fu.due_date < today;
        return (
          <div
            key={fu.id}
            className={cn(
              "flex items-center gap-3 rounded-md border px-3 py-2",
              overdue && "border-destructive/40 bg-destructive/5",
              fu.done === 1 && "opacity-60"
            )}
          >
            <Checkbox
              checked={fu.done === 1}
              onCheckedChange={(v) => toggle(fu, v === true)}
              aria-label={`Mark "${fu.action}" ${fu.done === 1 ? "not done" : "done"}`}
            />
            <div className="min-w-0 flex-1">
              <p className={cn("truncate text-sm", fu.done === 1 && "line-through")}>{fu.action}</p>
              <p className="truncate text-xs text-muted-foreground">
                {showContact && (
                  <>
                    <Link href={`/contacts/${fu.contact_id}`} className="hover:underline">
                      {fu.contact_name}
                    </Link>
                    {fu.deal_name ? ` · ${fu.deal_name}` : ""}
                    {" · "}
                  </>
                )}
                {!showContact && fu.deal_name ? `${fu.deal_name} · ` : ""}
                {fu.due_date}
              </p>
            </div>
            {fu.done === 0 &&
              (overdue ? (
                <Badge variant="destructive" className="gap-1 whitespace-nowrap">
                  <CalendarClock className="size-3" />
                  {relativeDays(fu.due_date)}
                </Badge>
              ) : (
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {relativeDays(fu.due_date)}
                </span>
              ))}
            {fu.done === 0 && <SnoozeButton followUp={fu} onDone={() => router.refresh()} />}
          </div>
        );
      })}
      {contactId &&
        (adding ? (
          <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2">
            <Input
              placeholder="Next action…"
              className="h-8"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              autoFocus
            />
            <Input
              type="date"
              className="h-8 w-36"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
            <Button size="sm" className="h-8" onClick={add}>
              Add
            </Button>
            <Button variant="ghost" size="sm" className="h-8" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="justify-start gap-1.5 text-muted-foreground"
            onClick={() => setAdding(true)}
          >
            <Plus className="size-3.5" />
            Add follow-up
          </Button>
        ))}
    </div>
  );
}
