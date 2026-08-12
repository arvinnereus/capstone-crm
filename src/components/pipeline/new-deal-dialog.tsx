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
import { ContactCombobox, type ContactOption } from "@/components/contacts/contact-combobox";
import { STREAM_LABELS } from "@/lib/constants";
import { isBrandId, streamsFor } from "@/lib/brands";
import { getClientDefaultBrand } from "@/lib/brand-client";

export function NewDealDialog({
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
  const [name, setName] = useState("");
  const [stream, setStream] = useState("");
  const [valueSGD, setValueSGD] = useState("");
  const [expectedClose, setExpectedClose] = useState("");
  const [saving, setSaving] = useState(false);

  // Stream options follow the chosen contact's brand (deals inherit it server-side).
  const chosenBrandRaw = (contact ?? initialContact)?.brand;
  const dealBrand = isBrandId(chosenBrandRaw) ? chosenBrandRaw : getClientDefaultBrand();
  const streamOptions = streamsFor(dealBrand);

  const submit = async () => {
    const chosen = contact ?? initialContact;
    if (!chosen || !name.trim() || !stream) {
      toast.error("Contact, deal name and revenue stream are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: chosen.id,
          name: name.trim(),
          stream,
          value_cents: Math.round((parseFloat(valueSGD) || 0) * 100),
          expected_close_date: expectedClose || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Deal "${name.trim()}" created`);
      setName("");
      setStream("");
      setValueSGD("");
      setExpectedClose("");
      if (!initialContact) setContact(null);
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Failed to create deal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Deal</DialogTitle>
          <DialogDescription>Add a deal to the pipeline. It starts in the Lead stage.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Contact *</Label>
            <ContactCombobox value={contact ?? initialContact} onChange={setContact} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nd-name">Deal name *</Label>
            <Input
              id="nd-name"
              placeholder="e.g. AI training rollout — 40 advisors"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Revenue stream *</Label>
              <Select value={stream} onValueChange={setStream}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stream" />
                </SelectTrigger>
                <SelectContent>
                  {streamOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STREAM_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nd-value">Value (SGD)</Label>
              <Input
                id="nd-value"
                type="number"
                min="0"
                step="100"
                placeholder="0"
                value={valueSGD}
                onChange={(e) => setValueSGD(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nd-close">Expected close date</Label>
            <Input
              id="nd-close"
              type="date"
              value={expectedClose}
              onChange={(e) => setExpectedClose(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Create deal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
