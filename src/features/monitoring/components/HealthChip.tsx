import { HEALTH_LABEL, type HealthStatus } from "@/features/monitoring/schemas";
import { cn } from "@/lib/utils";

/**
 * A service's health — the prototype's `monChip` (app-source.txt 373).
 *
 * The prototype keys colour off `MON_OK`, a map of hex pairs. Here the three
 * states map to semantic tokens, so the chip follows dark mode and satisfies
 * `.claude/rules/01`'s ban on colour in a component.
 *
 * The dot is `aria-hidden` and the status is spelled out beside it. That is the
 * WCAG 1.4.1 requirement — colour may not be the only way information is
 * conveyed — and it is the one thing the prototype's version already got right.
 */

const TONE: Record<HealthStatus, string> = {
  healthy: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  critical: "bg-destructive/10 text-destructive",
};

const DOT: Record<HealthStatus, string> = {
  healthy: "bg-success",
  warning: "bg-warning",
  critical: "bg-destructive",
};

interface HealthChipProps {
  status: HealthStatus;
  className?: string;
}

export const HealthChip = ({ status, className }: HealthChipProps) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
      TONE[status],
      className
    )}
  >
    <span className={cn("size-1.5 rounded-full", DOT[status])} aria-hidden />
    {HEALTH_LABEL[status]}
  </span>
);
