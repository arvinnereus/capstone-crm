-- Capstone CRM — initial schema
-- Conventions: TEXT ids, ISO-8601 TEXT timestamps, money as INTEGER SGD cents, booleans as INTEGER 0/1

CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  role TEXT,
  email TEXT,
  phone TEXT,
  segment TEXT CHECK (segment IN ('FA', 'MNC', 'GOV', 'SME')),
  status TEXT NOT NULL DEFAULT 'prospect' CHECK (status IN ('prospect', 'active_client', 'dormant')),
  lead_source TEXT CHECK (lead_source IN ('abigail', 'linkedin', 'referral', 'website', 'event', 'other')),
  grant_eligible INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  external_ref TEXT UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_contacts_status ON contacts (status);
CREATE INDEX idx_contacts_segment ON contacts (segment);
CREATE INDEX idx_contacts_lead_source ON contacts (lead_source);
CREATE INDEX idx_contacts_created_at ON contacts (created_at);

CREATE TABLE deals (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL REFERENCES contacts (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stream TEXT NOT NULL CHECK (stream IN ('fa', 'mnc', 'wsq_adapt', 'government', 'asean_licensing', 'digital')),
  stage TEXT NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost')),
  value_cents INTEGER NOT NULL DEFAULT 0,
  expected_close_date TEXT,
  stage_entered_at TEXT NOT NULL,
  won_at TEXT,
  final_value_cents INTEGER,
  lost_at TEXT,
  lost_reason TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_deals_stage ON deals (stage);
CREATE INDEX idx_deals_contact_id ON deals (contact_id);
CREATE INDEX idx_deals_stream ON deals (stream);

CREATE TABLE deal_stage_history (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL REFERENCES deals (id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_at TEXT NOT NULL
);

CREATE INDEX idx_stage_history_deal_id ON deal_stage_history (deal_id);

CREATE TABLE touchpoints (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL REFERENCES contacts (id) ON DELETE CASCADE,
  deal_id TEXT REFERENCES deals (id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('call', 'email', 'whatsapp', 'meeting')),
  occurred_at TEXT NOT NULL,
  note TEXT,
  meeting_url TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_touchpoints_contact ON touchpoints (contact_id, occurred_at);

CREATE TABLE follow_ups (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL REFERENCES contacts (id) ON DELETE CASCADE,
  deal_id TEXT REFERENCES deals (id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  due_date TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  done_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_follow_ups_pending ON follow_ups (done, due_date);

CREATE TABLE finance_transactions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
  txn_date TEXT,
  description TEXT,
  client TEXT,
  category TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  grant_qualifying INTEGER NOT NULL DEFAULT 0,
  source_row TEXT,
  synced_at TEXT NOT NULL
);

CREATE INDEX idx_finance_kind_date ON finance_transactions (kind, txn_date);

CREATE TABLE analytics_daily (
  day TEXT PRIMARY KEY,
  visitors INTEGER NOT NULL DEFAULT 0,
  page_views INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT NOT NULL
);

CREATE TABLE analytics_pages (
  day TEXT NOT NULL,
  path TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, path)
);

CREATE TABLE analytics_referrers (
  day TEXT NOT NULL,
  referrer TEXT NOT NULL,
  visits INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, referrer)
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE sync_log (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('sheets', 'cf_analytics')),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'ok', 'error')),
  message TEXT
);

-- Defaults: revenue milestones (SGD cents) and cumulative count start date.
-- Example placeholder values below — replace with your own targets/dates.
INSERT INTO settings (key, value) VALUES
  ('revenue_start_date', '"2026-01-01"'),
  ('milestones', '[{"date":"2026-06-30","target_cents":1000000},{"date":"2026-08-31","target_cents":2500000},{"date":"2026-11-30","target_cents":5000000},{"date":"2027-01-31","target_cents":10000000}]');
