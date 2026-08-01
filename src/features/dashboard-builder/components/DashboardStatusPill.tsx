import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  DashboardStatus,
  DashboardVersionStatus,
} from "@/features/dashboard-builder/schemas";

/**
 * The prototype's `dashList`/`dashPublish` status pills (`app-source.txt`
 * 2050: `r[3]==='Published'?C.active:'#FBF1DE'`) — teal tint for the "live"
 * state, amber tint otherwise. Composes `Badge` the same way `StatusPill`
 * (`components/StatusPill.tsx`) does rather than adding new `Badge`
 * variants, and reuses its exact `bg-accent text-accent-foreground` /
 * `bg-warning/10 text-warning` tone classes so this pill reads as the same
 * design system, not a one-off.
 */

const LIVE_CLASS = "bg-accent text-accent-foreground";
const PENDING_CLASS = "bg-warning/10 text-warning";

interface DashboardStatusPillProps {
  status: DashboardStatus;
  className?: string;
}

export const DashboardStatusPill = ({
  status,
  className,
}: DashboardStatusPillProps) => (
  <Badge
    className={cn(
      "px-2.5",
      status === "published" ? LIVE_CLASS : PENDING_CLASS,
      className
    )}
  >
    {status === "published" ? "Published" : "Draft"}
  </Badge>
);

interface DashboardVersionStatusPillProps {
  status: DashboardVersionStatus;
  className?: string;
}

export const DashboardVersionStatusPill = ({
  status,
  className,
}: DashboardVersionStatusPillProps) => (
  <Badge
    className={cn(
      "px-2.5",
      status === "live" ? LIVE_CLASS : "bg-muted text-muted-foreground",
      className
    )}
  >
    {status === "live" ? "Live" : "Archived"}
  </Badge>
);
