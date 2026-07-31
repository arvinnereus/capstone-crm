"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BellRing,
  Globe,
  Landmark,
  LayoutDashboard,
  Settings,
  SquareKanban,
  User,
  Users,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

const OPEN_EVENT = "capstone:open-command-menu";

export function openCommandMenu() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

type ContactHit = { id: string; name: string; company: string | null };

const PAGES = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Pipeline", url: "/pipeline", icon: SquareKanban },
  { title: "Contacts", url: "/contacts", icon: Users },
  { title: "Follow-ups", url: "/follow-ups", icon: BellRing },
  { title: "Finance", url: "/finance", icon: Landmark },
  { title: "Analytics", url: "/analytics", icon: Globe },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ContactHit[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setHits([]);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/contacts?search=${encodeURIComponent(query.trim())}&limit=5`, {
        signal: controller.signal,
      })
        .then((r) => (r.ok ? (r.json() as Promise<{ contacts?: ContactHit[] }>) : null))
        .then((data) => {
          if (data?.contacts) setHits(data.contacts);
        })
        .catch(() => {});
    }, 200);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [open, query]);

  const go = (url: string) => {
    setOpen(false);
    setQuery("");
    router.push(url);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Search pages and contacts">
      <CommandInput placeholder="Search pages and contacts…" value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {hits.length > 0 && (
          <>
            <CommandGroup heading="Contacts">
              {hits.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.name} ${c.company ?? ""} ${c.id}`}
                  onSelect={() => go(`/contacts/${c.id}`)}
                >
                  <User />
                  <span>{c.name}</span>
                  {c.company && <span className="text-muted-foreground">— {c.company}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        <CommandGroup heading="Pages">
          {PAGES.map((p) => (
            <CommandItem key={p.url} value={p.title} onSelect={() => go(p.url)}>
              <p.icon />
              <span>{p.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
