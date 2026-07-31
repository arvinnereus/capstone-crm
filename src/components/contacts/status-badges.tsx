import { Badge } from "@/components/ui/badge";
import {
  CONTACT_STATUS_LABELS,
  SEGMENT_LABELS,
  STAGE_LABELS,
  type ContactStatus,
  type Segment,
  type Stage,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: ContactStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        status === "active_client" && "border-success/50 text-success",
        status === "prospect" && "border-primary/50 text-primary",
        status === "dormant" && "text-muted-foreground"
      )}
    >
      {CONTACT_STATUS_LABELS[status]}
    </Badge>
  );
}

export function SegmentBadge({ segment }: { segment: Segment | null }) {
  if (!segment) return null;
  return <Badge variant="secondary">{SEGMENT_LABELS[segment]}</Badge>;
}

export function GrantBadge({ eligible }: { eligible: boolean }) {
  return eligible ? (
    <Badge variant="outline" className="border-warning/50 text-warning">
      Adapt Academy
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      Direct billing
    </Badge>
  );
}

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        stage === "won" && "border-success/50 text-success",
        stage === "lost" && "border-destructive/50 text-destructive",
        stage !== "won" && stage !== "lost" && "border-primary/50 text-primary"
      )}
    >
      {STAGE_LABELS[stage]}
    </Badge>
  );
}
