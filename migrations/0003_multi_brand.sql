-- v3.0 Multi-Business Foundation: brand column on contacts, deals, finance_transactions.
-- Brands: 'consulting' (Capstone Consulting), 'hatch' (Hatch Studio), 'ailab' (Capstone AI Lab).
-- contacts + deals are rebuilt to relax per-brand enums (segment/lead_source/stream CHECKs
-- move to app-layer Zod validation); stage CHECK is kept — stage keys are universal, brands
-- differ only in labels.

PRAGMA defer_foreign_keys = true;

-- ── contacts ──────────────────────────────────────────────────────────────
CREATE TABLE contacts_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  role TEXT,
  email TEXT,
  phone TEXT,
  segment TEXT,
  status TEXT NOT NULL DEFAULT 'prospect' CHECK (status IN ('prospect', 'active_client', 'dormant')),
  lead_source TEXT,
  grant_eligible INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  external_ref TEXT UNIQUE,
  brand TEXT NOT NULL DEFAULT 'consulting' CHECK (brand IN ('consulting', 'hatch', 'ailab')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO contacts_new (
  id, name, company, role, email, phone, segment, status, lead_source,
  grant_eligible, notes, external_ref, created_at, updated_at
)
SELECT
  id, name, company, role, email, phone, segment, status, lead_source,
  grant_eligible, notes, external_ref, created_at, updated_at
FROM contacts;

DROP TABLE contacts;
ALTER TABLE contacts_new RENAME TO contacts;

CREATE INDEX idx_contacts_status ON contacts (status);
CREATE INDEX idx_contacts_segment ON contacts (segment);
CREATE INDEX idx_contacts_lead_source ON contacts (lead_source);
CREATE INDEX idx_contacts_created_at ON contacts (created_at);
CREATE INDEX idx_contacts_brand ON contacts (brand);

-- ── deals ─────────────────────────────────────────────────────────────────
CREATE TABLE deals_new (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL REFERENCES contacts (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stream TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost')),
  value_cents INTEGER NOT NULL DEFAULT 0,
  expected_close_date TEXT,
  stage_entered_at TEXT NOT NULL,
  won_at TEXT,
  final_value_cents INTEGER,
  lost_at TEXT,
  lost_reason TEXT,
  notes TEXT,
  brand TEXT NOT NULL DEFAULT 'consulting' CHECK (brand IN ('consulting', 'hatch', 'ailab')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO deals_new (
  id, contact_id, name, stream, stage, value_cents, expected_close_date,
  stage_entered_at, won_at, final_value_cents, lost_at, lost_reason, notes,
  created_at, updated_at
)
SELECT
  id, contact_id, name, stream, stage, value_cents, expected_close_date,
  stage_entered_at, won_at, final_value_cents, lost_at, lost_reason, notes,
  created_at, updated_at
FROM deals;

DROP TABLE deals;
ALTER TABLE deals_new RENAME TO deals;

CREATE INDEX idx_deals_stage ON deals (stage);
CREATE INDEX idx_deals_contact_id ON deals (contact_id);
CREATE INDEX idx_deals_stream ON deals (stream);
CREATE INDEX idx_deals_brand ON deals (brand);

-- ── finance_transactions ──────────────────────────────────────────────────
-- Sheets sync writes Capstone Consulting books; Stripe ingestion (v3.5) will
-- tag hatch/ailab rows explicitly.
ALTER TABLE finance_transactions ADD COLUMN brand TEXT NOT NULL DEFAULT 'consulting';
CREATE INDEX idx_finance_brand ON finance_transactions (brand);
