"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONTACT_STATUS_LABELS,
  CONTACT_STATUSES,
  LEAD_SOURCE_LABELS,
  LEAD_SOURCES,
  SEGMENT_LABELS,
  SEGMENTS,
} from "@/lib/constants";

const ALL = "__all__";

export function ContactsFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== ALL) params.set(key, value);
      else params.delete(key);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      if ((searchParams.get("search") ?? "") !== search) setParam("search", search || null);
    }, 300);
    return () => clearTimeout(t);
  }, [search, setParam, searchParams]);

  const hasFilters = ["search", "segment", "status", "lead_source", "grant_eligible", "overdue"].some(
    (k) => searchParams.has(k)
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search name, company, email…"
          className="w-64 pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Select value={searchParams.get("segment") ?? ALL} onValueChange={(v) => setParam("segment", v)}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All segments</SelectItem>
          {SEGMENTS.map((s) => (
            <SelectItem key={s} value={s}>
              {SEGMENT_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={searchParams.get("status") ?? ALL} onValueChange={(v) => setParam("status", v)}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {CONTACT_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {CONTACT_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("lead_source") ?? ALL}
        onValueChange={(v) => setParam("lead_source", v)}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All sources</SelectItem>
          {LEAD_SOURCES.map((s) => (
            <SelectItem key={s} value={s}>
              {LEAD_SOURCE_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant={searchParams.get("grant_eligible") === "1" ? "secondary" : "outline"}
        size="sm"
        onClick={() => setParam("grant_eligible", searchParams.get("grant_eligible") === "1" ? null : "1")}
      >
        Grant eligible
      </Button>
      <Button
        variant={searchParams.get("overdue") === "1" ? "secondary" : "outline"}
        size="sm"
        onClick={() => setParam("overdue", searchParams.get("overdue") === "1" ? null : "1")}
      >
        Overdue follow-up
      </Button>
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground"
          onClick={() => {
            setSearch("");
            router.replace(pathname);
          }}
        >
          <X className="size-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
