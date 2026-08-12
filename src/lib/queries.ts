import { todaySG } from "@/lib/format";
import type { BrandView } from "@/lib/brands";
import type {
  ContactListRow,
  ContactRow,
  ContentJobListRow,
  ContentJobRow,
  ContentShotRow,
  DealRow,
  DealWithContact,
  FollowUpRow,
  FollowUpWithContext,
  StageHistoryRow,
  TouchpointRow,
} from "@/lib/types";

export type ContactFilters = {
  search?: string;
  segment?: string;
  status?: string;
  lead_source?: string;
  grant_eligible?: boolean;
  overdue?: boolean;
  brand?: BrandView;
};

export async function listContacts(db: D1Database, filters: ContactFilters): Promise<ContactListRow[]> {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.brand && filters.brand !== "group") {
    conditions.push("c.brand = ?");
    params.push(filters.brand);
  }
  if (filters.search) {
    conditions.push("(c.name LIKE ? OR c.company LIKE ? OR c.email LIKE ?)");
    const like = `%${filters.search}%`;
    params.push(like, like, like);
  }
  if (filters.segment) {
    conditions.push("c.segment = ?");
    params.push(filters.segment);
  }
  if (filters.status) {
    conditions.push("c.status = ?");
    params.push(filters.status);
  }
  if (filters.lead_source) {
    conditions.push("c.lead_source = ?");
    params.push(filters.lead_source);
  }
  if (filters.grant_eligible) {
    conditions.push("c.grant_eligible = 1");
  }
  if (filters.overdue) {
    conditions.push(
      "EXISTS (SELECT 1 FROM follow_ups f WHERE f.contact_id = c.id AND f.done = 0 AND f.due_date < ?)"
    );
    params.push(todaySG());
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { results } = await db
    .prepare(
      `SELECT c.*,
        (SELECT MAX(t.occurred_at) FROM touchpoints t WHERE t.contact_id = c.id) AS last_touch,
        (SELECT MIN(f.due_date) FROM follow_ups f WHERE f.contact_id = c.id AND f.done = 0) AS next_due,
        (SELECT COUNT(*) FROM deals d WHERE d.contact_id = c.id AND d.stage NOT IN ('won','lost')) AS open_deals
       FROM contacts c ${where}
       ORDER BY c.updated_at DESC LIMIT 500`
    )
    .bind(...params)
    .all<ContactListRow>();
  return results;
}

export type ContactDetail = {
  contact: ContactRow;
  deals: DealRow[];
  touchpoints: TouchpointRow[];
  followUps: FollowUpRow[];
  stageHistory: StageHistoryRow[];
};

export async function getContactDetail(db: D1Database, id: string): Promise<ContactDetail | null> {
  const contact = await db.prepare("SELECT * FROM contacts WHERE id = ?").bind(id).first<ContactRow>();
  if (!contact) return null;

  const [deals, touchpoints, followUps, stageHistory] = await Promise.all([
    db.prepare("SELECT * FROM deals WHERE contact_id = ? ORDER BY created_at DESC").bind(id).all<DealRow>(),
    db
      .prepare("SELECT * FROM touchpoints WHERE contact_id = ? ORDER BY occurred_at DESC, created_at DESC")
      .bind(id)
      .all<TouchpointRow>(),
    db
      .prepare("SELECT * FROM follow_ups WHERE contact_id = ? ORDER BY done ASC, due_date ASC")
      .bind(id)
      .all<FollowUpRow>(),
    db
      .prepare(
        `SELECT h.*, d.name AS deal_name FROM deal_stage_history h
         JOIN deals d ON d.id = h.deal_id WHERE d.contact_id = ?
         ORDER BY h.changed_at DESC`
      )
      .bind(id)
      .all<StageHistoryRow>(),
  ]);

  return {
    contact,
    deals: deals.results,
    touchpoints: touchpoints.results,
    followUps: followUps.results,
    stageHistory: stageHistory.results,
  };
}

export async function listDealsWithContacts(
  db: D1Database,
  brand: BrandView = "group"
): Promise<DealWithContact[]> {
  const where = brand !== "group" ? "WHERE d.brand = ?" : "";
  const stmt = db.prepare(
    `SELECT d.*, c.name AS contact_name, c.company AS contact_company
     FROM deals d JOIN contacts c ON c.id = d.contact_id
     ${where} ORDER BY d.updated_at DESC`
  );
  const { results } = await (brand !== "group" ? stmt.bind(brand) : stmt).all<DealWithContact>();
  return results;
}

export async function listFollowUps(
  db: D1Database,
  filter: "open" | "done" | "all",
  brand: BrandView = "group"
): Promise<FollowUpWithContext[]> {
  const conditions: string[] = [];
  const params: string[] = [];
  if (filter === "open") conditions.push("f.done = 0");
  if (filter === "done") conditions.push("f.done = 1");
  if (brand !== "group") {
    conditions.push("c.brand = ?");
    params.push(brand);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { results } = await db
    .prepare(
      `SELECT f.*, c.name AS contact_name, c.company AS contact_company, d.name AS deal_name
       FROM follow_ups f
       JOIN contacts c ON c.id = f.contact_id
       LEFT JOIN deals d ON d.id = f.deal_id
       ${where} ORDER BY f.done ASC, f.due_date ASC LIMIT 500`
    )
    .bind(...params)
    .all<FollowUpWithContext>();
  return results;
}

export async function listContentJobs(
  db: D1Database,
  { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {}
): Promise<ContentJobListRow[]> {
  const { results } = await db
    .prepare(
      `SELECT j.*,
        (SELECT COUNT(*) FROM content_shots s WHERE s.job_id = j.id) AS shot_total,
        (SELECT COUNT(*) FROM content_shots s WHERE s.job_id = j.id AND s.status = 'done') AS shot_done,
        (SELECT COUNT(*) FROM content_shots s WHERE s.job_id = j.id AND s.status = 'failed') AS shot_failed
       FROM content_jobs j
       ORDER BY j.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(limit, offset)
    .all<ContentJobListRow>();
  return results;
}

export type ContentJobDetail = {
  job: ContentJobRow;
  shots: ContentShotRow[];
};

export async function getContentJobDetail(db: D1Database, id: string): Promise<ContentJobDetail | null> {
  const job = await db.prepare("SELECT * FROM content_jobs WHERE id = ?").bind(id).first<ContentJobRow>();
  if (!job) return null;

  const { results: shots } = await db
    .prepare("SELECT * FROM content_shots WHERE job_id = ? ORDER BY shot_index ASC")
    .bind(id)
    .all<ContentShotRow>();

  return { job, shots };
}
