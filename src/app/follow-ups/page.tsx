import { FollowUpList } from "@/components/follow-ups/follow-up-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/lib/db";
import { getActiveBrandView } from "@/lib/brand-context";
import { brandViewLabel } from "@/lib/brands";
import { todaySG } from "@/lib/format";
import { listFollowUps } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function FollowUpsPage() {
  const db = await getDb();
  const brand = await getActiveBrandView();
  const followUps = await listFollowUps(db, "open", brand);
  const today = todaySG();
  const overdue = followUps.filter((f) => f.due_date < today);
  const upcoming = followUps.filter((f) => f.due_date >= today);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Follow-ups · {brandViewLabel(brand)}</h2>
        <p className="text-sm text-muted-foreground">
          {overdue.length} overdue · {upcoming.length} upcoming
        </p>
      </div>
      {overdue.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-sm text-destructive">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <FollowUpList followUps={overdue} />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Upcoming</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing scheduled. Log a touchpoint and set the next action to keep deals moving.
            </p>
          ) : (
            <FollowUpList followUps={upcoming} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
