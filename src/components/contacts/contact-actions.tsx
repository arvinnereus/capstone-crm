"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Handshake, MessageSquarePlus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditContactDialog } from "@/components/contacts/edit-contact-dialog";
import { NewDealDialog } from "@/components/pipeline/new-deal-dialog";
import { LogTouchpointDialog } from "@/components/touchpoints/log-touchpoint-dialog";
import type { ContactRow } from "@/lib/types";

export function ContactActions({ contact }: { contact: ContactRow }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [dealOpen, setDealOpen] = useState(false);
  const [touchpointOpen, setTouchpointOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const contactOption = { id: contact.id, name: contact.name, company: contact.company };

  const remove = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Contact "${contact.name}" deleted`);
      router.push("/contacts");
      router.refresh();
    } catch {
      toast.error("Failed to delete contact");
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" className="gap-1.5" onClick={() => setTouchpointOpen(true)}>
        <MessageSquarePlus className="size-3.5" />
        Log touchpoint
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDealOpen(true)}>
        <Handshake className="size-3.5" />
        New deal
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="size-8" aria-label="More actions">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil />
            Edit contact
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 />
            Delete contact
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditContactDialog contact={contact} open={editOpen} onOpenChange={setEditOpen} />
      <NewDealDialog open={dealOpen} onOpenChange={setDealOpen} initialContact={contactOption} />
      <LogTouchpointDialog
        open={touchpointOpen}
        onOpenChange={setTouchpointOpen}
        initialContact={contactOption}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {contact.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the contact and all linked deals, touchpoints and follow-ups.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={remove}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
