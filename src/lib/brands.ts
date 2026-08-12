import type { Stage, Stream } from "@/lib/constants";

/**
 * v3.0 Multi-Business Foundation.
 * One CRM, three brands, two legal entities. Stage KEYS are universal
 * (lead → qualified → proposal_sent → negotiation → won/lost) so queries and
 * history stay uniform; each brand supplies its own LABELS. Streams (revenue
 * lines) are fully per-brand.
 */

export const BRAND_IDS = ["consulting", "hatch", "ailab"] as const;
export type BrandId = (typeof BRAND_IDS)[number];

/** A brand view is a brand, or the all-brands Group rollup. */
export type BrandView = BrandId | "group";

export const BRAND_COOKIE = "crm_brand";
export const DEFAULT_BRAND_VIEW: BrandView = "group";

export type BrandMeta = {
  id: BrandId;
  label: string;
  short: string;
  domain: string;
  entity: string;
  /** Tailwind-compatible accent color for dots/badges. */
  color: string;
  stageLabels: Record<Stage, string>;
  streams: Stream[];
};

export const BRANDS: Record<BrandId, BrandMeta> = {
  consulting: {
    id: "consulting",
    label: "Capstone Consulting",
    short: "Consulting",
    domain: "capstoneconsulting.com.sg",
    entity: "Capstone Consulting Pte Ltd",
    color: "var(--chart-1)",
    stageLabels: {
      lead: "Lead",
      qualified: "Qualified",
      proposal_sent: "Proposal Sent",
      negotiation: "Negotiation",
      won: "Won",
      lost: "Lost",
    },
    streams: ["fa", "mnc", "wsq_adapt", "government", "asean_licensing", "digital"],
  },
  hatch: {
    id: "hatch",
    label: "Hatch Studio",
    short: "Hatch",
    domain: "hatchstudio.io",
    entity: "Capstone Media and Training Pte Ltd",
    color: "var(--chart-3)",
    stageLabels: {
      lead: "Inquiry",
      qualified: "Order Paid",
      proposal_sent: "Brief Collected",
      negotiation: "In Build",
      won: "Launched",
      lost: "Cancelled",
    },
    streams: ["hatch_starter", "hatch_business", "hatch_custom", "hatch_care_plan"],
  },
  ailab: {
    id: "ailab",
    label: "Capstone AI Lab",
    short: "AI Lab",
    domain: "capstoneailab.com",
    entity: "Capstone Consulting Pte Ltd",
    color: "var(--chart-5)",
    stageLabels: {
      lead: "Waitlist",
      qualified: "Engaged",
      proposal_sent: "Trial",
      negotiation: "Checkout",
      won: "Member",
      lost: "Churned",
    },
    streams: ["ailab_adult", "ailab_kids", "ailab_silver", "ailab_family"],
  },
};

export const BRAND_LIST: BrandMeta[] = BRAND_IDS.map((id) => BRANDS[id]);

export function isBrandId(value: string | undefined | null): value is BrandId {
  return !!value && (BRAND_IDS as readonly string[]).includes(value);
}

export function parseBrandView(value: string | undefined | null): BrandView {
  if (value === "group" || isBrandId(value)) return value;
  return DEFAULT_BRAND_VIEW;
}

export function brandViewLabel(view: BrandView): string {
  return view === "group" ? "Group View" : BRANDS[view].label;
}

/** Stage labels for a view — Group falls back to the neutral Consulting set. */
export function stageLabelsFor(view: BrandView): Record<Stage, string> {
  return view === "group" ? BRANDS.consulting.stageLabels : BRANDS[view].stageLabels;
}

/** Streams selectable for a brand (Group = all streams). */
export function streamsFor(view: BrandView): Stream[] {
  if (view === "group") return BRAND_LIST.flatMap((b) => b.streams);
  return BRANDS[view].streams;
}
