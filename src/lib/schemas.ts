import { z } from "zod";

import {
  CONTACT_STATUSES,
  CONTENT_LANGUAGE_MODES,
  LEAD_SOURCES,
  SEGMENTS,
  STAGES,
  STREAMS,
  TOUCHPOINT_TYPES,
} from "@/lib/constants";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const contactCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  company: z.string().trim().max(200).nullish(),
  role: z.string().trim().max(200).nullish(),
  email: z.string().trim().max(320).nullish(),
  phone: z.string().trim().max(50).nullish(),
  segment: z.enum(SEGMENTS).nullish(),
  status: z.enum(CONTACT_STATUSES).default("prospect"),
  lead_source: z.enum(LEAD_SOURCES).nullish(),
  grant_eligible: z.boolean().default(false),
  notes: z.string().max(10_000).nullish(),
});

export const contactUpdateSchema = contactCreateSchema.partial();

export const dealCreateSchema = z.object({
  contact_id: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  stream: z.enum(STREAMS),
  value_cents: z.number().int().min(0).default(0),
  expected_close_date: dateString.nullish(),
  notes: z.string().max(10_000).nullish(),
});

export const dealUpdateSchema = dealCreateSchema.omit({ contact_id: true }).partial();

export const dealStageSchema = z.object({
  to_stage: z.enum(STAGES),
  final_value_cents: z.number().int().min(0).optional(),
  lost_reason: z.string().trim().max(1000).optional(),
});

export const touchpointCreateSchema = z.object({
  contact_id: z.string().min(1),
  deal_id: z.string().nullish(),
  type: z.enum(TOUCHPOINT_TYPES),
  occurred_at: dateString,
  note: z.string().max(10_000).nullish(),
});

export const followUpCreateSchema = z.object({
  contact_id: z.string().min(1),
  deal_id: z.string().nullish(),
  action: z.string().trim().min(1).max(500),
  due_date: dateString,
});

export const followUpUpdateSchema = z.object({
  action: z.string().trim().min(1).max(500).optional(),
  due_date: dateString.optional(),
  done: z.boolean().optional(),
});

export const contentJobCreateSchema = z
  .object({
    inputType: z.enum(["url", "text"]),
    inputUrl: z.string().trim().url().max(2000).optional(),
    inputText: z.string().trim().max(50_000).optional(),
    languageMode: z.enum(CONTENT_LANGUAGE_MODES),
  })
  .refine((v) => (v.inputType === "url" ? !!v.inputUrl : !!v.inputText), {
    message: "inputUrl is required when inputType is 'url', inputText when inputType is 'text'",
  });
