import { BRANDS, BRAND_LIST, brandViewLabel, type BrandView } from "@/lib/brands";
import { getDashboardData } from "@/lib/dashboard";
import { todaySG } from "@/lib/format";
import { listContacts, listDealsWithContacts, listFollowUps } from "@/lib/queries";

/**
 * Read-only CRM tools exposed to the assistant model (OpenAI tool format,
 * served via OpenRouter). Money values in the database are SGD cents; tool
 * results convert to whole SGD before they reach the model.
 */

export const ASSISTANT_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_contacts",
      description:
        "List CRM contacts with their last touchpoint, next follow-up due date and open deal count. Use to find who to call, stale leads, or look someone up.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Match against name, company or email" },
          status: { type: "string", enum: ["prospect", "active_client", "dormant"] },
          overdue_only: { type: "boolean", description: "Only contacts with overdue follow-ups" },
          brand: { type: "string", enum: ["group", "consulting", "hatch", "ailab"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_deals",
      description: "List deals with stage, value, contact and days in stage.",
      parameters: {
        type: "object",
        properties: {
          brand: { type: "string", enum: ["group", "consulting", "hatch", "ailab"] },
          open_only: { type: "boolean", description: "Exclude won and lost deals" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_follow_ups",
      description: "List open follow-up actions with due dates and linked contact/deal.",
      parameters: {
        type: "object",
        properties: {
          brand: { type: "string", enum: ["group", "consulting", "hatch", "ailab"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_business_snapshot",
      description:
        "Dashboard numbers for a brand or the whole group: cumulative revenue, this month's income/expenses, pipeline by stage, won/lost, revenue by business, lead volume.",
      parameters: {
        type: "object",
        properties: {
          brand: { type: "string", enum: ["group", "consulting", "hatch", "ailab"] },
        },
      },
    },
  },
] as const;

const sgd = (cents: number | null | undefined) => Math.round((cents ?? 0) / 100);

function daysSince(iso: string | null | undefined, today: string): number | null {
  if (!iso) return null;
  const then = new Date(iso.slice(0, 10) + "T00:00:00Z").getTime();
  const now = new Date(today + "T00:00:00Z").getTime();
  return Math.round((now - then) / 86_400_000);
}

export async function runAssistantTool(
  db: D1Database,
  name: string,
  args: Record<string, unknown>,
  activeBrand: BrandView
): Promise<unknown> {
  const brand = (typeof args.brand === "string" ? args.brand : activeBrand) as BrandView;
  const today = todaySG();

  if (name === "get_contacts") {
    const rows = await listContacts(db, {
      search: typeof args.search === "string" ? args.search : undefined,
      status: typeof args.status === "string" ? args.status : undefined,
      overdue: args.overdue_only === true,
      brand,
    });
    return rows.slice(0, 50).map((c) => ({
      id: c.id,
      name: c.name,
      company: c.company,
      email: c.email,
      phone: c.phone,
      brand: BRANDS[c.brand]?.short ?? c.brand,
      segment: c.segment,
      status: c.status,
      lead_source: c.lead_source,
      created: c.created_at.slice(0, 10),
      days_since_created: daysSince(c.created_at, today),
      last_touch: c.last_touch?.slice(0, 10) ?? null,
      days_since_last_touch: daysSince(c.last_touch, today),
      next_follow_up_due: c.next_due,
      open_deals: c.open_deals,
      notes: c.notes ? c.notes.slice(0, 500) : null,
    }));
  }

  if (name === "get_deals") {
    const rows = await listDealsWithContacts(db, brand);
    const filtered = args.open_only === true ? rows.filter((d) => d.stage !== "won" && d.stage !== "lost") : rows;
    return filtered.slice(0, 50).map((d) => ({
      id: d.id,
      name: d.name,
      contact: d.contact_name,
      company: d.contact_company,
      brand: BRANDS[d.brand]?.short ?? d.brand,
      stage: BRANDS[d.brand]?.stageLabels[d.stage] ?? d.stage,
      stage_key: d.stage,
      value_sgd: sgd(d.stage === "won" ? d.final_value_cents ?? d.value_cents : d.value_cents),
      days_in_stage: daysSince(d.stage_entered_at, today),
      expected_close: d.expected_close_date,
      lost_reason: d.lost_reason,
    }));
  }

  if (name === "get_follow_ups") {
    const rows = await listFollowUps(db, "open", brand);
    return rows.slice(0, 50).map((f) => ({
      action: f.action,
      due: f.due_date,
      overdue: f.due_date < today,
      contact: f.contact_name,
      company: f.contact_company,
      deal: f.deal_name,
    }));
  }

  if (name === "get_business_snapshot") {
    const d = await getDashboardData(db, brand);
    return {
      view: brandViewLabel(brand),
      cumulative_revenue_sgd: sgd(d.business.cumulative_cents),
      revenue_target_sgd: sgd(d.business.target_cents),
      this_month: {
        income_sgd: sgd(d.business.month_income_cents),
        expenses_sgd: sgd(d.business.month_expense_cents),
      },
      won_revenue_by_business:
        brand === "group"
          ? d.business.by_brand.map((r) => ({ business: BRANDS[r.brand]?.label ?? r.brand, sgd: sgd(r.cents) }))
          : undefined,
      won_revenue_by_stream:
        brand !== "group" ? d.business.by_stream.map((r) => ({ stream: r.stream, sgd: sgd(r.cents) })) : undefined,
      pipeline: {
        active_deals: d.pipeline.active_count,
        open_value_sgd: sgd(d.pipeline.open_value_cents),
        overdue_follow_ups: d.pipeline.overdue_count,
        win_rate_pct: d.pipeline.win_rate,
        by_stage: d.pipeline.by_stage.map((s) => ({ stage: s.stage, count: s.count, value_sgd: sgd(s.value_cents) })),
      },
      new_leads_this_week: d.marketing.leads_this_week,
      website_visitors_7d: d.website.visitors_7d,
    };
  }

  return { error: `Unknown tool: ${name}` };
}

export function assistantSystemPrompt(activeBrand: BrandView): string {
  const brands = BRAND_LIST.map((b) => `- ${b.label} (${b.domain}) — entity: ${b.entity}`).join("\n");
  return `You are Joseph, the built-in assistant of the Capstone Command Center, the CRM that runs Arvin's three businesses:
${brands}

Today's date (Singapore): ${todaySG()}.
The user is currently viewing: ${brandViewLabel(activeBrand)}. Default tool calls to this view unless they ask about another business or the whole group.

You have read-only tools over live CRM data. Always call tools before answering questions about contacts, deals, follow-ups, revenue or pipeline — never invent data. All money values in tool results are whole SGD.

Style:
- Be a sharp chief-of-staff: lead with the answer, then the reasoning. Short paragraphs and tight lists, no filler.
- For "who should I call" style questions: rank by urgency (overdue follow-ups first, then stale-but-warm leads, then big open deals idle in stage), and give one-line talking points drawn from notes and deal context.
- Flag data gaps honestly (e.g. no phone number on file, lead sitting untouched for weeks).
- When the data is empty, say so plainly and suggest what would populate it.
- Answer in plain text: use "-" for lists and blank lines between sections. No markdown symbols like **, #, or tables.`;
}
