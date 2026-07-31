import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { JobDetailView } from "@/components/content/job-detail-view";
import { getDb } from "@/lib/db";
import { getContentJobDetail } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ContentJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const detail = await getContentJobDetail(db, id);
  if (!detail) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Link href="/content" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Content Creation
      </Link>
      <JobDetailView initialJob={detail.job} initialShots={detail.shots} />
    </div>
  );
}
