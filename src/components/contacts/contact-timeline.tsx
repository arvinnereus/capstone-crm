import { ArrowRight, Mail, MessageCircle, Phone, UserPlus, Video } from "lucide-react";

import { STAGE_LABELS, type TouchpointType } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { ContactRow, StageHistoryRow, TouchpointRow } from "@/lib/types";

const TOUCHPOINT_ICONS: Record<TouchpointType, typeof Phone> = {
  call: Phone,
  email: Mail,
  whatsapp: MessageCircle,
  meeting: Video,
};

type TimelineEvent = {
  key: string;
  date: string;
  icon: typeof Phone;
  title: string;
  detail: string | null;
};

export function ContactTimeline({
  contact,
  touchpoints,
  stageHistory,
}: {
  contact: ContactRow;
  touchpoints: TouchpointRow[];
  stageHistory: StageHistoryRow[];
}) {
  const events: TimelineEvent[] = [
    ...touchpoints.map((t) => ({
      key: `tp-${t.id}`,
      date: t.occurred_at,
      icon: TOUCHPOINT_ICONS[t.type],
      title: { call: "Call", email: "Email", whatsapp: "WhatsApp", meeting: "Meeting" }[t.type],
      detail: t.note,
    })),
    ...stageHistory.map((h) => ({
      key: `sh-${h.id}`,
      date: h.changed_at,
      icon: ArrowRight,
      title: h.from_stage
        ? `${h.deal_name}: ${STAGE_LABELS[h.from_stage]} → ${STAGE_LABELS[h.to_stage]}`
        : `${h.deal_name}: deal created`,
      detail: null,
    })),
    {
      key: "created",
      date: contact.created_at,
      icon: UserPlus,
      title: "Contact added",
      detail: null,
    },
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="flex flex-col">
      {events.map((event, i) => (
        <div key={event.key} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-muted">
              <event.icon className="size-3.5 text-muted-foreground" />
            </div>
            {i < events.length - 1 && <div className="w-px flex-1 bg-border" />}
          </div>
          <div className="flex-1 pb-5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium">{event.title}</p>
              <p className="shrink-0 text-xs text-muted-foreground">{formatDate(event.date)}</p>
            </div>
            {event.detail && (
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{event.detail}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
