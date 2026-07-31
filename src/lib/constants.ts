export const STAGES = [
  "lead",
  "qualified",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
] as const;
export type Stage = (typeof STAGES)[number];

export const OPEN_STAGES: Stage[] = ["lead", "qualified", "proposal_sent", "negotiation"];

export const STAGE_LABELS: Record<Stage, string> = {
  lead: "Lead",
  qualified: "Qualified",
  proposal_sent: "Proposal Sent",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

export const STREAMS = [
  "fa",
  "mnc",
  "wsq_adapt",
  "government",
  "asean_licensing",
  "digital",
] as const;
export type Stream = (typeof STREAMS)[number];

export const STREAM_LABELS: Record<Stream, string> = {
  fa: "FA Financial Services",
  mnc: "MNC Custom",
  wsq_adapt: "WSQ / Adapt Academy",
  government: "Government",
  asean_licensing: "ASEAN Licensing",
  digital: "Digital Products",
};

/** Fixed chart color per stream — a stream is always the same color in every chart. */
export const STREAM_COLORS: Record<Stream, string> = {
  fa: "var(--chart-1)",
  mnc: "var(--chart-2)",
  wsq_adapt: "var(--chart-3)",
  government: "var(--chart-4)",
  asean_licensing: "var(--chart-5)",
  digital: "var(--chart-6)",
};

export const SEGMENTS = ["FA", "MNC", "GOV", "SME"] as const;
export type Segment = (typeof SEGMENTS)[number];

export const SEGMENT_LABELS: Record<Segment, string> = {
  FA: "Financial Advisory",
  MNC: "MNC",
  GOV: "Government",
  SME: "SME",
};

export const CONTACT_STATUSES = ["prospect", "active_client", "dormant"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  prospect: "Prospect",
  active_client: "Active Client",
  dormant: "Dormant",
};

export const LEAD_SOURCES = [
  "abigail",
  "linkedin",
  "referral",
  "website",
  "event",
  "other",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  abigail: "Abigail",
  linkedin: "LinkedIn",
  referral: "Referral",
  website: "Website",
  event: "Event",
  other: "Other",
};

export const TOUCHPOINT_TYPES = ["call", "email", "whatsapp", "meeting"] as const;
export type TouchpointType = (typeof TOUCHPOINT_TYPES)[number];

export const TOUCHPOINT_TYPE_LABELS: Record<TouchpointType, string> = {
  call: "Call",
  email: "Email",
  whatsapp: "WhatsApp",
  meeting: "Meeting",
};

export const REVENUE_TARGET_CENTS = 200_000_000; // SGD 2M

export const CONTENT_LANGUAGE_MODES = ["zh", "en"] as const;
export type ContentLanguageMode = (typeof CONTENT_LANGUAGE_MODES)[number];

export const CONTENT_LANGUAGE_MODE_LABELS: Record<ContentLanguageMode, string> = {
  zh: "Chinese",
  en: "English",
};

export const CONTENT_JOB_STATUSES = ["drafting", "drafted", "generating", "done", "failed"] as const;
export type ContentJobStatus = (typeof CONTENT_JOB_STATUSES)[number];

export const CONTENT_SHOT_STATUSES = ["pending", "generating", "done", "failed"] as const;
export type ContentShotStatus = (typeof CONTENT_SHOT_STATUSES)[number];

export const CONTENT_STRUCTURE_TYPES = [
  "Workflow",
  "System-snapshot",
  "Before-after",
  "Character-state",
  "Concept-metaphor",
  "Method-layers",
  "Map-route",
  "Comic-panels",
] as const;
export type ContentStructureType = (typeof CONTENT_STRUCTURE_TYPES)[number];
