import type {
  ContactStatus,
  ContentJobStatus,
  ContentLanguageMode,
  ContentShotStatus,
  LeadSource,
  Segment,
  Stage,
  Stream,
  TouchpointType,
} from "@/lib/constants";
import type { BrandId } from "@/lib/brands";

export type ContactRow = {
  id: string;
  name: string;
  company: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  segment: Segment | null;
  status: ContactStatus;
  lead_source: LeadSource | null;
  grant_eligible: number;
  notes: string | null;
  external_ref: string | null;
  brand: BrandId;
  created_at: string;
  updated_at: string;
};

export type ContactListRow = ContactRow & {
  last_touch: string | null;
  next_due: string | null;
  open_deals: number;
};

export type DealRow = {
  id: string;
  contact_id: string;
  name: string;
  stream: Stream;
  stage: Stage;
  brand: BrandId;
  value_cents: number;
  expected_close_date: string | null;
  stage_entered_at: string;
  won_at: string | null;
  final_value_cents: number | null;
  lost_at: string | null;
  lost_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DealWithContact = DealRow & {
  contact_name: string;
  contact_company: string | null;
};

export type TouchpointRow = {
  id: string;
  contact_id: string;
  deal_id: string | null;
  type: TouchpointType;
  occurred_at: string;
  note: string | null;
  meeting_url: string | null;
  created_at: string;
};

export type FollowUpRow = {
  id: string;
  contact_id: string;
  deal_id: string | null;
  action: string;
  due_date: string;
  done: number;
  done_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FollowUpWithContext = FollowUpRow & {
  contact_name: string;
  contact_company: string | null;
  deal_name: string | null;
};

export type StageHistoryRow = {
  id: string;
  deal_id: string;
  from_stage: Stage | null;
  to_stage: Stage;
  changed_at: string;
  deal_name?: string;
};

export type ContentJobRow = {
  id: string;
  status: ContentJobStatus;
  language_mode: ContentLanguageMode;
  input_type: "url" | "text";
  input_url: string | null;
  input_text: string | null;
  article_title: string | null;
  core_argument: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type ContentJobListRow = ContentJobRow & {
  shot_total: number;
  shot_done: number;
  shot_failed: number;
};

export type ContentShotRow = {
  id: string;
  job_id: string;
  shot_index: number;
  theme: string | null;
  structure_type: string | null;
  core_idea: string | null;
  composition: string | null;
  elements_json: string | null;
  labels_json: string | null;
  image_prompt: string | null;
  status: ContentShotStatus;
  kie_task_id: string | null;
  kie_state: string | null;
  source_image_url: string | null;
  r2_key: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type FinanceTransactionRow = {
  id: string;
  kind: "income" | "expense";
  brand: BrandId;
  txn_date: string | null;
  description: string | null;
  client: string | null;
  category: string | null;
  amount_cents: number;
  grant_qualifying: number;
  source_row: string | null;
  synced_at: string;
};
