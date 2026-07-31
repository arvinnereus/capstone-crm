"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { OverdueBadge } from "@/components/shell/overdue-badge";
import { QuickActions } from "@/components/shell/quick-actions";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { openCommandMenu } from "@/components/shell/command-menu";

const TITLES: [string, string][] = [
  ["/pipeline", "Pipeline"],
  ["/contacts", "Contacts"],
  ["/follow-ups", "Follow-ups"],
  ["/finance", "Finance"],
  ["/analytics", "Website Analytics"],
  ["/settings", "Settings"],
];

function pageTitle(pathname: string): string {
  const match = TITLES.find(([prefix]) => pathname.startsWith(prefix));
  return match ? match[1] : "Command Center";
}

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-5" />
      <h1 className="text-sm font-semibold">{pageTitle(pathname)}</h1>
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="hidden gap-2 text-muted-foreground sm:flex"
          onClick={openCommandMenu}
        >
          <Search className="size-3.5" />
          <span className="text-xs">Search</span>
          <kbd className="pointer-events-none rounded border bg-muted px-1 font-mono text-[10px]">
            ⌘K
          </kbd>
        </Button>
        <OverdueBadge />
        <QuickActions />
        <ThemeToggle />
      </div>
    </header>
  );
}
