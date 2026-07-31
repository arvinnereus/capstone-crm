import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NewJobForm } from "@/components/content/new-job-form";
import { getDb } from "@/lib/db";
import { CONTENT_LANGUAGE_MODE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { listContentJobs } from "@/lib/queries";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  drafting: "secondary",
  drafted: "secondary",
  generating: "secondary",
  done: "default",
  failed: "destructive",
};

export default async function ContentPage() {
  const db = await getDb();
  const jobs = await listContentJobs(db, { limit: 50 });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Content Creation</h2>
        <p className="text-sm text-muted-foreground">
          Paste an article — a shot list drafts itself, then each illustration generates in the
          Xiaohei hand-drawn style.
        </p>
      </div>

      <NewJobForm />

      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">Job history</h3>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Article</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Shots</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No content jobs yet.
                  </TableCell>
                </TableRow>
              )}
              {jobs.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(j.created_at)}</TableCell>
                  <TableCell>
                    <Link href={`/content/${j.id}`} className="font-medium hover:underline">
                      {j.article_title || "(untitled)"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {CONTENT_LANGUAGE_MODE_LABELS[j.language_mode]}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[j.status] ?? "outline"}>{j.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {j.shot_done}/{j.shot_total} done
                    {j.shot_failed > 0 ? `, ${j.shot_failed} failed` : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
