"use client";

import { TREND_PERIODS, type TrendPeriod } from "@/features/trends/schemas";
import { cn } from "@/lib/utils";

/**
 * The 7 / 14 / 30-day period toggle — the prototype's `perPill` (app-source.txt
 * 1907, wired at 1972). Controlled rather than owning `trendPeriod` itself: the
 * period is part of `useTrends`'s query key (`features/trends/api/keys.ts`), so
 * the page component is the one place that may own it as `useState`.
 *
 * Follows `ChartKindToggle`'s established convention for a same-purpose toggle
 * rather than inventing a second one: a `role="group"` wrapper carries the
 * accessible name, and each button announces its own state via `aria-pressed`
 * rather than colour alone. The prototype's pill (`onClick:()=>this.setState(...)`,
 * inline `background`/`border`) is translated to Tailwind state classes and a
 * real `<button type="button">` — the prototype's version is a `<span
 * onClick>`, unreachable by keyboard and not a control at all.
 */

/**
 * Exported so `TrendsScreen`'s "Production KPIs — N-Day Trend" heading can
 * name the period actually selected, rather than the prototype's hardcoded
 * "7-Day" (`prodSection`, app-source.txt 1918) staying on screen after a
 * click changes the underlying data (`route.ts`'s own docblock names that gap
 * as a deliberate improvement over the prototype for the *data*; the heading
 * has to follow it or the improvement is invisible).
 */
export const PERIOD_LABEL: Record<TrendPeriod, string> = {
  "7d": "7 days",
  "14d": "14 days",
  "30d": "30 days",
};

export interface PeriodPillsProps {
  value: TrendPeriod;
  onChange: (period: TrendPeriod) => void;
  /**
   * Disables every pill while a fetch is in flight — the same
   * `disabled={isFetching}` convention `ActionsTable`/`EntriesTable`/
   * `UsersTable`/`SummariesTable`/`AuditTable` already apply to their own
   * in-flight controls, so a click can't queue a second request behind one
   * still resolving.
   */
  disabled?: boolean;
  className?: string;
}

export const PeriodPills = ({
  value,
  onChange,
  disabled = false,
  className,
}: PeriodPillsProps) => (
  <div
    role="group"
    aria-label="Trend period"
    className={cn("flex flex-wrap items-center gap-2", className)}
  >
    {TREND_PERIODS.map((period) => {
      const active = period === value;

      return (
        <button
          key={period}
          type="button"
          aria-pressed={active}
          disabled={disabled}
          onClick={() => onChange(period)}
          className={cn(
            "rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-colors",
            "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-60",
            active
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          )}
        >
          {PERIOD_LABEL[period]}
        </button>
      );
    })}
  </div>
);
