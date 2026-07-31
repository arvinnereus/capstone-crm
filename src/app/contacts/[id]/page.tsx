import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ContactActions } from "@/components/contacts/contact-actions";
import { ContactTimeline } from "@/components/contacts/contact-timeline";
import { GrantBadge, SegmentBadge, StageBadge, StatusBadge } from "@/components/contacts/status-badges";
import { FollowUpList } from "@/components/follow-ups/follow-up-list";
import { getDb } from "@/lib/db";
import { LEAD_SOURCE_LABELS, STREAM_LABELS } from "@/lib/constants";
import { formatDate, formatSGD } from "@/lib/format";
import { getContactDetail } from "@/lib/queries";
import type { FollowUpWithContext } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ContactProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getDb();
  const detail = await getContactDetail(db, id);
  if (!detail) notFound();

  const { contact, deals, touchpoints, followUps, stageHistory } = detail;
  const dealNames = new Map(deals.map((d) => [d.id, d.name]));
  const followUpsWithContext: FollowUpWithContext[] = followUps.map((f) => ({
    ...f,
    contact_name: contact.name,
    contact_company: contact.company,
    deal_name: f.deal_id ? dealNames.get(f.deal_id) ?? null : null,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/contacts"
            className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" />
            Contacts
          </Link>
          <h2 className="text-xl font-semibold">{contact.name}</h2>
          <p className="text-sm text-muted-foreground">
            {[contact.role, contact.company].filter(Boolean).join(" · ") || "—"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={contact.status} />
            <SegmentBadge segment={contact.segment} />
            <GrantBadge eligible={contact.grant_eligible === 1} />
            {contact.lead_source && (
              <span className="text-xs text-muted-foreground">
                via {LEAD_SOURCE_LABELS[contact.lead_source]}
              </span>
            )}
          </div>
        </div>
        <ContactActions contact={contact} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Mail className="size-3.5" />
                  {contact.email}
                </a>
              )}
              {contact.phone && (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-3.5" />
                  {contact.phone}
                </span>
              )}
              {!contact.email && !contact.phone && (
                <p className="text-muted-foreground">No contact details yet.</p>
              )}
              {contact.notes && (
                <>
                  <Separator className="my-1" />
                  <p className="whitespace-pre-wrap text-muted-foreground">{contact.notes}</p>
                </>
              )}
              <Separator className="my-1" />
              <p className="text-xs text-muted-foreground">Added {formatDate(contact.created_at)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Follow-ups</CardTitle>
            </CardHeader>
            <CardContent>
              <FollowUpList
                followUps={followUpsWithContext}
                showContact={false}
                contactId={contact.id}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Deals</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {deals.length === 0 && (
                <p className="text-sm text-muted-foreground">No deals yet.</p>
              )}
              {deals.map((d) => (
                <Link
                  key={d.id}
                  href={`/pipeline?deal=${d.id}`}
                  className="rounded-md border p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{d.name}</p>
                    <StageBadge stage={d.stage} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {STREAM_LABELS[d.stream]} ·{" "}
                    <span className="tabular-nums">
                      {formatSGD(d.stage === "won" ? d.final_value_cents ?? d.value_cents : d.value_cents)}
                    </span>
                  </p>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Engagement Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ContactTimeline contact={contact} touchpoints={touchpoints} stageHistory={stageHistory} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
