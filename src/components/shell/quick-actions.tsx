"use client";

import { useState } from "react";
import { Handshake, MessageSquarePlus, Plus, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NewContactDialog } from "@/components/contacts/new-contact-dialog";
import { NewDealDialog } from "@/components/pipeline/new-deal-dialog";
import { LogTouchpointDialog } from "@/components/touchpoints/log-touchpoint-dialog";

export function QuickActions() {
  const [contactOpen, setContactOpen] = useState(false);
  const [dealOpen, setDealOpen] = useState(false);
  const [touchpointOpen, setTouchpointOpen] = useState(false);

  return (
    <>
      {/* Desktop: three explicit buttons; mobile: one + menu */}
      <div className="hidden items-center gap-2 lg:flex">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setContactOpen(true)}>
          <UserPlus className="size-3.5" />
          Contact
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDealOpen(true)}>
          <Handshake className="size-3.5" />
          Deal
        </Button>
        <Button size="sm" className="gap-1.5" onClick={() => setTouchpointOpen(true)}>
          <MessageSquarePlus className="size-3.5" />
          Log Touchpoint
        </Button>
      </div>
      <div className="lg:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" aria-label="Quick actions">
              <Plus className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setContactOpen(true)}>
              <UserPlus />
              New contact
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDealOpen(true)}>
              <Handshake />
              New deal
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTouchpointOpen(true)}>
              <MessageSquarePlus />
              Log touchpoint
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <NewContactDialog open={contactOpen} onOpenChange={setContactOpen} />
      <NewDealDialog open={dealOpen} onOpenChange={setDealOpen} />
      <LogTouchpointDialog open={touchpointOpen} onOpenChange={setTouchpointOpen} />
    </>
  );
}
