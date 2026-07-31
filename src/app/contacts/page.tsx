import { Suspense } from "react";
import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ContactsFilterBar } from "@/components/contacts/contacts-filter-bar";
import { GrantBadge, SegmentBadge, StatusBadge } from "@/components/contacts/status-badges";
import { getDb } from "@/lib/db";
import { LEAD_SOURCE_LABELS } from "@/lib/constants";
import { formatDate, relativeDays, todaySG } from "@/lib/format";
import { listContacts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

  const db = await getDb();
  const contacts = await listContacts(db, {
    search: str(params.search),
    segment: str(params.segment),
    status: str(params.status),
    lead_source: str(params.lead_source),
    grant_eligible: str(params.grant_eligible) === "1",
    overdue: str(params.overdue) === "1",
  });

  const today = todaySG();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Contacts</h2>
          <p className="text-sm text-muted-foreground">
            {contacts.length} contact{contacts.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <Suspense>
        <ContactsFilterBar />
      </Suspense>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Segment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Billing</TableHead>
              <TableHead className="hidden lg:table-cell">Source</TableHead>
              <TableHead className="hidden md:table-cell">Open deals</TableHead>
              <TableHead className="hidden md:table-cell">Last touch</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No contacts yet. Add your first contact with the button in the header.
                </TableCell>
              </TableRow>
            )}
            {contacts.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/contacts/${c.id}`} className="font-medium hover:underline">
                    {c.name}
                  </Link>
                  {c.company && <div className="text-xs text-muted-foreground">{c.company}</div>}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <SegmentBadge segment={c.segment} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={c.status} />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <GrantBadge eligible={c.grant_eligible === 1} />
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {c.lead_source ? LEAD_SOURCE_LABELS[c.lead_source] : "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell tabular-nums">
                  {c.open_deals > 0 ? c.open_deals : "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {formatDate(c.last_touch)}
                </TableCell>
                <TableCell>
                  {c.next_due ? (
                    c.next_due < today ? (
                      <Badge variant="destructive">{relativeDays(c.next_due)}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">{relativeDays(c.next_due)}</span>
                    )
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
