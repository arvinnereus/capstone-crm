"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ContactCombobox, type ContactOption } from "@/components/contacts/contact-combobox";
import { TOUCHPOINT_TYPE_LABELS, TOUCHPOINT_TYPES } from "@/lib/constants";
import { todaySG } from "@/lib/format";

export function LogTouchpointDialog({
  open,
  onOpenChange,
  initialContact = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContact?: ContactOption | null;
}) {
  const router = useRouter();
  const [contact, setContact] = useState<ContactOption | null>(initialContact);
  const [type, setType] = useState("call");
  const [date, setDate] = useState(todaySG());
  const [note, setNote] = useState("");
  const [followUpAction, setFollowUpAction] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const chosen = contact ?? initialContact;
    if (!chosen) {
      toast.error("Select a contact");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/touchpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: chosen.id,
          type,
          occurred_at: date,
          note: note.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());

      if (followUpAction.trim() && followUpDate) {
        const fu = await fetch("/api/follow-ups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contact_id: chosen.id,
            action: followUpAction.trim(),
            due_date: followUpDate,
          }),
        });
        if (!fu.ok) toast.warning("Touchpoint saved, but the follow-up failed");
      }

      toast.success("Touchpoint logged");
      setNote("");
      setFollowUpAction("");
      setFollowUpDate("");
      if (!initialContact) setContact(null);
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Failed to log touchpoint");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Touchpoint</DialogTitle>
          <DialogDescription>Record a call, email, WhatsApp or meeting.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Contact *</Label>
            <ContactCombobox value={contact ?? initialContact} onChange={setContact} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOUCHPOINT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TOUCHPOINT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lt-date">Date</Label>
              <Input id="lt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lt-note">Note</Label>
            <Textarea
              id="lt-note"
              rows={3}
              placeholder="What was discussed, outcomes, signals…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="rounded-lg border p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Next action (optional — keeps the deal moving)
            </p>
            <div className="grid grid-cols-[1fr_140px] gap-2">
              <Input
                placeholder="e.g. Send proposal"
                value={followUpAction}
                onChange={(e) => setFollowUpAction(e.target.value)}
              />
              <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Log touchpoint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
