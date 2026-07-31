import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClientBar } from "@/components/finance/client-bar";
import { ExpenseDonut } from "@/components/finance/expense-donut";
import { SyncButton } from "@/components/sync-button";
import { getDb } from "@/lib/db";
import { REVENUE_TARGET_CENTS } from "@/lib/constants";
import { formatDate, formatSGD, formatSGDPrecise, todaySG } from "@/lib/format";
import type { FinanceTransactionRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const db = await getDb();
  const year = todaySG().slice(0, 4);

  const [totals, byClient, byCategory, eisd, recentIncome, recentExpenses, lastSync] =
    await Promise.all([
      db
        .prepare(
          `SELECT kind, SUM(amount_cents) AS cents FROM finance_transactions
           WHERE substr(txn_date, 1, 4) = ? GROUP BY kind`
        )
        .bind(year)
        .all<{ kind: string; cents: number }>(),
      db
        .prepare(
          `SELECT client, SUM(amount_cents) AS cents FROM finance_transactions
           WHERE kind = 'income' GROUP BY client ORDER BY cents DESC LIMIT 10`
        )
        .all<{ client: string; cents: number }>(),
      db
        .prepare(
          `SELECT category, SUM(amount_cents) AS cents FROM finance_transactions
           WHERE kind = 'expense' GROUP BY category ORDER BY cents DESC`
        )
        .all<{ category: string; cents: number }>(),
      db
        .prepare(
          "SELECT SUM(amount_cents) AS cents FROM finance_transactions WHERE kind = 'expense' AND grant_qualifying = 1"
        )
        .first<{ cents: number | null }>(),
      db
        .prepare(
          "SELECT * FROM finance_transactions WHERE kind = 'income' ORDER BY txn_date DESC LIMIT 5"
        )
        .all<FinanceTransactionRow>(),
      db
        .prepare(
          "SELECT * FROM finance_transactions WHERE kind = 'expense' ORDER BY txn_date DESC LIMIT 5"
        )
        .all<FinanceTransactionRow>(),
      db
        .prepare(
          "SELECT finished_at, status, message FROM sync_log WHERE source = 'sheets' ORDER BY started_at DESC LIMIT 1"
        )
        .first<{ finished_at: string | null; status: string; message: string | null }>(),
    ]);

  const incomeYTD = totals.results.find((r) => r.kind === "income")?.cents ?? 0;
  const expensesYTD = totals.results.find((r) => r.kind === "expense")?.cents ?? 0;
  const net = incomeYTD - expensesYTD;
  const hasData = totals.results.length > 0 || byClient.results.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Finance Snapshot</h2>
          <p className="text-sm text-muted-foreground">
            Read-only view of the Capstone Group Finance Tracker V2
            {lastSync?.finished_at && ` · last synced ${formatDate(lastSync.finished_at)}`}
            {lastSync?.status === "error" && (
              <span className="text-destructive"> · last sync failed: {lastSync.message}</span>
            )}
          </p>
        </div>
        <SyncButton endpoint="/api/finance/sync" label="Sync from Sheets" />
      </div>

      {!hasData && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No finance data yet. Click “Sync from Sheets” to pull the tracker for the first time.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-normal text-muted-foreground">Income YTD ({year})</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-semibold tabular-nums text-success">
              {formatSGD(incomeYTD)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {((incomeYTD / REVENUE_TARGET_CENTS) * 100).toFixed(1)}% of SGD 2M
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-normal text-muted-foreground">Expenses YTD</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-semibold tabular-nums">{formatSGD(expensesYTD)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-normal text-muted-foreground">Net position</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`font-mono text-2xl font-semibold tabular-nums ${
                net >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {formatSGD(net)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-normal text-muted-foreground">
              Grant-qualifying spend (EISD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-semibold tabular-nums text-warning">
              {formatSGD(eisd?.cents ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Income by client</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientBar byClient={byClient.results} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Expenses by category</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseDonut byCategory={byCategory.results} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {(
          [
            ["Recent income", recentIncome.results, "income"],
            ["Recent expenses", recentExpenses.results, "expense"],
          ] as const
        ).map(([title, rows, kind]) => (
          <Card key={kind}>
            <CardHeader>
              <CardTitle className="text-sm">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>{kind === "income" ? "Client" : "Vendor"}</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                        No data
                      </TableCell>
                    </TableRow>
                  )}
                  {rows.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {t.txn_date ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-32 truncate text-sm">{t.client ?? "—"}</TableCell>
                      <TableCell className="max-w-48 truncate text-sm text-muted-foreground">
                        {t.description ?? "—"}
                        {t.grant_qualifying === 1 && (
                          <Badge variant="outline" className="ml-1.5 border-warning/50 text-[10px] text-warning">
                            EISD
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {formatSGDPrecise(t.amount_cents)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
