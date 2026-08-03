import { usageStatus, type HealthStatus } from "@/features/monitoring/schemas";
import { percentWidthClass } from "@/lib/percent-width";
import { cn } from "@/lib/utils";

/**
 * A resource utilisation reading — the prototype's `usageBar`
 * (app-source.txt 378–380).
 *
 * ## It is a `<progressbar>`, not a styled div
 *
 * The prototype draws two nested `<div>`s with a percentage width. That is
 * invisible to assistive technology: a screen-reader user gets the label and
 * the number beside it but nothing that says the number is a proportion of a
 * whole, and nothing announces when it changes. `role="progressbar"` with the
 * `aria-value*` triple is the element the platform already has for exactly
 * this, so the meter announces as "CPU usage, 42%".
 *
 * ## The width is a rounded utility class, not a style
 *
 * `lib/percent-width.ts` records why, and now serves the compliance meter too.
 * The fill colour deliberately did **not** move with it: this bar reads high as
 * bad, and a bar that reads high as good must not inherit that.
 */

const FILL: Record<HealthStatus, string> = {
  healthy: "bg-primary",
  warning: "bg-warning",
  critical: "bg-destructive",
};

const VALUE_TONE: Record<HealthStatus, string> = {
  healthy: "text-foreground",
  warning: "text-warning",
  critical: "text-destructive",
};

interface UsageBarProps {
  label: string;
  percent: number;
  className?: string;
}

export const UsageBar = ({ label, percent, className }: UsageBarProps) => {
  const status = usageStatus(percent);
  /*
    Clamped, because `aria-valuenow` is declared against `aria-valuemax={100}`
    below and the wire schema is a bare `z.number()`. `percentWidthClass` already
    clamps the fill, so an out-of-range reading would have shown a full bar while
    announcing "105%" — the visual and the announcement disagreeing is worse than
    either being wrong alone. Latent today (the only source is a fixed seed), but
    the schema permits it and the fix is one expression.
  */
  const rounded = Math.round(Math.min(100, Math.max(0, percent)));

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm">{label}</span>
        <span
          className={cn("text-sm font-bold tabular-nums", VALUE_TONE[status])}
        >
          {rounded}%
        </span>
      </div>

      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={label}
        aria-valuenow={rounded}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            FILL[status],
            percentWidthClass(percent)
          )}
        />
      </div>
    </div>
  );
};
