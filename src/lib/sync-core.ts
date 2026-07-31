/**
 * Sync engines for external data sources. Pure Workers-runtime code (WebCrypto,
 * fetch) so it runs both in the Next.js worker (manual refresh) and the cron
 * sync worker.
 */

const INCOME_TAB = "Capstone Group Finance Tracker V2 - Income";
const EXPENSES_TAB = "Capstone Group Finance Tracker V2 - Expenses";

// ---------- helpers ----------

function b64url(data: string | Uint8Array): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** Parse "12/6/2026", "12 Jun 2026", "2026-06-12" → "2026-06-12" (or null). */
export function parseSheetDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const dmy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

/** Parse "$1,234.50", "1234.5", "SGD 1,234" → cents (or 0). */
export function parseMoneyCents(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9.\-]/g, "");
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

function parseBool(raw: string | undefined): boolean {
  if (!raw) return false;
  return ["yes", "y", "true", "1", "✓"].includes(raw.trim().toLowerCase());
}

async function logSync(
  db: D1Database,
  source: "sheets" | "cf_analytics",
  fn: () => Promise<string>
): Promise<{ ok: boolean; message: string }> {
  const id = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  await db
    .prepare("INSERT INTO sync_log (id, source, started_at, status) VALUES (?, ?, ?, 'running')")
    .bind(id, source, startedAt)
    .run();
  try {
    const message = await fn();
    await db
      .prepare("UPDATE sync_log SET finished_at = ?, status = 'ok', message = ? WHERE id = ?")
      .bind(new Date().toISOString(), message, id)
      .run();
    return { ok: true, message };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db
      .prepare("UPDATE sync_log SET finished_at = ?, status = 'error', message = ? WHERE id = ?")
      .bind(new Date().toISOString(), message, id)
      .run();
    return { ok: false, message };
  }
}

// ---------- Google Sheets ----------

type ServiceAccount = { client_email: string; private_key: string; token_uri: string };

async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson) as ServiceAccount;
  const now = Math.floor(Date.now() / 1000);
  const unsigned =
    b64url(JSON.stringify({ alg: "RS256", typ: "JWT" })) +
    "." +
    b64url(
      JSON.stringify({
        iss: sa.client_email,
        scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
        aud: sa.token_uri,
        iat: now,
        exp: now + 600,
      })
    );

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned)
  );
  const jwt = `${unsigned}.${b64url(new Uint8Array(signature))}`;

  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const json = (await res.json()) as { access_token?: string; error_description?: string };
  if (!json.access_token) {
    throw new Error(`Google token exchange failed: ${json.error_description ?? res.status}`);
  }
  return json.access_token;
}

async function fetchSheetRows(
  accessToken: string,
  sheetId: string,
  tab: string,
  range: string
): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
    `'${tab}'!${range}`
  )}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const json = (await res.json()) as { values?: string[][]; error?: { message: string } };
  if (json.error) throw new Error(`Sheets API (${tab}): ${json.error.message}`);
  return json.values ?? [];
}

export async function syncSheets(
  db: D1Database,
  serviceAccountJson: string,
  sheetIds: { income: string; expenses: string }
): Promise<{ ok: boolean; message: string }> {
  return logSync(db, "sheets", async () => {
    const token = await getGoogleAccessToken(serviceAccountJson);
    const [incomeRows, expenseRows] = await Promise.all([
      fetchSheetRows(token, sheetIds.income, INCOME_TAB, "A2:O"),
      fetchSheetRows(token, sheetIds.expenses, EXPENSES_TAB, "A2:N"),
    ]);

    const syncedAt = new Date().toISOString();
    const statements = [db.prepare("DELETE FROM finance_transactions")];
    const insert = db.prepare(
      `INSERT INTO finance_transactions
       (id, kind, txn_date, description, client, category, amount_cents, grant_qualifying, source_row, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    let incomeCount = 0;
    incomeRows.forEach((row, i) => {
      // A:Invoice Date B:Client C:Invoice# D:Description G:Total(SGD)
      const date = parseSheetDate(row[0]);
      const amount = parseMoneyCents(row[6]);
      if (!date && amount === 0) return; // skip blank rows
      incomeCount++;
      statements.push(
        insert.bind(
          `income:${i + 2}`,
          "income",
          date,
          [row[3], row[2] ? `(${row[2]})` : null].filter(Boolean).join(" ") || null,
          row[1] || null,
          row[7] || null,
          amount,
          0,
          `income!A${i + 2}`,
          syncedAt
        )
      );
    });

    let expenseCount = 0;
    expenseRows.forEach((row, i) => {
      // A:Date C:Vendor D:Description G:Total(SGD) H:Category L:Grant Qualifying
      const date = parseSheetDate(row[0]);
      const amount = parseMoneyCents(row[6]);
      if (!date && amount === 0) return;
      expenseCount++;
      statements.push(
        insert.bind(
          `expense:${i + 2}`,
          "expense",
          date,
          row[3] || null,
          row[2] || null,
          row[7] || null,
          amount,
          parseBool(row[11]) ? 1 : 0,
          `expenses!A${i + 2}`,
          syncedAt
        )
      );
    });

    await db.batch(statements);
    return `Synced ${incomeCount} income + ${expenseCount} expense rows`;
  });
}

// ---------- Cloudflare Web Analytics (RUM) ----------

type RumGroup = {
  count: number;
  sum: { visits: number };
  dimensions: { date?: string; requestPath?: string; refererHost?: string };
};

async function rumQuery(
  apiToken: string,
  accountTag: string,
  siteTag: string,
  dimensionField: "date" | "requestPath" | "refererHost",
  sinceDate: string,
  limit: number
): Promise<RumGroup[]> {
  const query = `
    query Rum($accountTag: string!, $filter: AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          rumPageloadEventsAdaptiveGroups(filter: $filter, limit: ${limit}) {
            count
            sum { visits }
            dimensions { ${dimensionField} }
          }
        }
      }
    }`;
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      variables: {
        accountTag,
        filter: { siteTag, date_geq: sinceDate, date_leq: new Date().toISOString().slice(0, 10) },
      },
    }),
  });
  const json = (await res.json()) as {
    data?: { viewer: { accounts: { rumPageloadEventsAdaptiveGroups: RumGroup[] }[] } };
    errors?: { message: string }[];
  };
  if (json.errors?.length) throw new Error(`CF GraphQL: ${json.errors[0].message}`);
  return json.data?.viewer.accounts[0]?.rumPageloadEventsAdaptiveGroups ?? [];
}

export async function syncAnalytics(
  db: D1Database,
  apiToken: string,
  accountTag: string,
  siteTag: string
): Promise<{ ok: boolean; message: string }> {
  return logSync(db, "cf_analytics", async () => {
    const daysAgo = (n: number) => {
      const d = new Date();
      d.setDate(d.getDate() - n);
      return d.toISOString().slice(0, 10);
    };

    const [daily, pages, referrers] = await Promise.all([
      rumQuery(apiToken, accountTag, siteTag, "date", daysAgo(30), 31),
      rumQuery(apiToken, accountTag, siteTag, "requestPath", daysAgo(7), 50),
      rumQuery(apiToken, accountTag, siteTag, "refererHost", daysAgo(7), 50),
    ]);

    const syncedAt = new Date().toISOString();
    const today = daysAgo(0);
    const statements: D1PreparedStatement[] = [];

    for (const g of daily) {
      if (!g.dimensions.date) continue;
      statements.push(
        db
          .prepare(
            `INSERT INTO analytics_daily (day, visitors, page_views, synced_at) VALUES (?, ?, ?, ?)
             ON CONFLICT(day) DO UPDATE SET visitors = excluded.visitors, page_views = excluded.page_views, synced_at = excluded.synced_at`
          )
          .bind(g.dimensions.date, g.sum.visits, g.count, syncedAt)
      );
    }

    // Pages/referrers are stored against today's date as a rolling 7-day window snapshot
    statements.push(db.prepare("DELETE FROM analytics_pages"), db.prepare("DELETE FROM analytics_referrers"));
    for (const g of pages) {
      if (!g.dimensions.requestPath) continue;
      statements.push(
        db
          .prepare("INSERT INTO analytics_pages (day, path, views) VALUES (?, ?, ?)")
          .bind(today, g.dimensions.requestPath, g.count)
      );
    }
    for (const g of referrers) {
      const host = g.dimensions.refererHost || "(direct)";
      statements.push(
        db
          .prepare(
            `INSERT INTO analytics_referrers (day, referrer, visits) VALUES (?, ?, ?)
             ON CONFLICT(day, referrer) DO UPDATE SET visits = visits + excluded.visits`
          )
          .bind(today, host, g.sum.visits)
      );
    }

    await db.batch(statements);
    return `Synced ${daily.length} days, ${pages.length} pages, ${referrers.length} referrers`;
  });
}
