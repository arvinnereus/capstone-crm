"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type ContactOption = { id: string; name: string; company: string | null; brand?: string };

export function ContactCombobox({
  value,
  onChange,
  placeholder = "Select contact…",
}: {
  value: ContactOption | null;
  onChange: (contact: ContactOption | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<ContactOption[]>([]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const t = setTimeout(() => {
      const params = new URLSearchParams({ limit: "8" });
      if (query.trim()) params.set("search", query.trim());
      fetch(`/api/contacts?${params}`, { signal: controller.signal })
        .then((r) => (r.ok ? (r.json() as Promise<{ contacts?: ContactOption[] }>) : null))
        .then((data) => {
          if (data?.contacts) setOptions(data.contacts);
        })
        .catch(() => {});
    }, 200);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [open, query]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          {value ? (
            <span className="truncate">
              {value.name}
              {value.company ? ` — ${value.company}` : ""}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search contacts…" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>No contacts found.</CommandEmpty>
            <CommandGroup>
              {options.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.id}
                  onSelect={() => {
                    onChange(c.id === value?.id ? null : c);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("size-4", value?.id === c.id ? "opacity-100" : "opacity-0")} />
                  <span>{c.name}</span>
                  {c.company && <span className="text-muted-foreground">— {c.company}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
