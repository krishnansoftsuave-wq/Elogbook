import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * One number with a label — the prototype's `trendTile` (app-source.txt
 * 1896–1899), and, before this promotion, the "Shift KPIs" widget's own
 * one-off (`dashWidgets`, app-source.txt 112). Both are the same shape: an
 * icon, a label, a number, an optional caption, a colour.
 *
 * **Promoted from `features/home/components/StatTile.tsx`.** That file's own
 * docblock named the trigger in advance — "the promotion rule here is two
 * consuming features, and today there is one. Phase 4's management KPIs
 * (FR-AN-02) is the expected second, and moving it then is a rename, not a
 * rewrite" — and this is that second consumer arriving: the Trends & KPIs
 * screen's stat row (Total open items, Overdue, Due ≤ 7 days, equipment out
 * of service, OLET, next ship). Two consuming features means two, so it moved
 * rather than growing a near-identical twin — it composes `ui/card.tsx` and
 * draws no SVG, so it was never a chart primitive despite `trendTile` sitting
 * beside the chart helpers in the prototype's own file. Live in
 * `features/home/components/ShiftKpis.tsx` and (from Phase 4) the trends
 * feature.
 *
 * It **composes** `ui/card.tsx` rather than being hand-authored as a
 * shadcn-shaped primitive, the same rule `StatusPill` follows for `Badge`.
 *
 * `value` is a string rather than a number so a caller can pass "—" for "not
 * known yet" without this component having to invent a placeholder — and so a
 * future percentage or ratio needs no new prop.
 */

interface StatTileProps {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Extra context under the number, e.g. "of 14 open". */
  hint?: string;
  /** Tailwind text-colour class for the icon and value, e.g. `text-destructive`. */
  tone?: string;
  isLoading?: boolean;
  /**
   * Which side the icon renders on. Defaults to `"end"` — the "Shift KPIs"
   * widget's original placement, unchanged so the home dashboard's layout
   * never moves under a caller it didn't ask to change. Trends' cards pass
   * `"start"` to match the prototype's `trendTile`, which places the icon
   * first (`app-source.txt` 1896: `this.ic(icon,…), this.h('span',…,label)`).
   */
  iconPosition?: "start" | "end";
  /**
   * Tailwind `size-*` class for the icon. Defaults to `"size-5"` (20px), the
   * value every pre-existing caller (`ShiftKpis.tsx`) already renders at.
   * `trendTile` (`app-source.txt` 1896) sets its icon at `font-size:17` — a
   * quarter-rem step Tailwind v4's spacing scale expresses exactly as
   * `size-4.25` (4.25 x 0.25rem = 17px), not an arbitrary `size-[17px]`
   * escape hatch. Trends' compliance tiles pass this explicitly; every other
   * caller is unaffected.
   */
  iconSize?: string;
}

export const StatTile = ({
  label,
  value,
  icon: Icon,
  hint,
  tone,
  isLoading = false,
  iconPosition = "end",
  iconSize = "size-5",
}: StatTileProps) => {
  const icon = (
    <Icon
      className={cn(iconSize, "shrink-0", tone ?? "text-muted-foreground")}
      aria-hidden
    />
  );

  return (
    <Card>
      <CardContent
        className={cn(
          "flex items-start gap-3 py-1",
          iconPosition === "end" && "justify-between"
        )}
      >
        {iconPosition === "start" ? icon : null}
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          {isLoading ? (
            <Skeleton className="h-7 w-12" />
          ) : (
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums",
                tone ?? "text-foreground"
              )}
            >
              {value}
            </p>
          )}
          {hint ? (
            <p className="truncate text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        {iconPosition === "end" ? icon : null}
      </CardContent>
    </Card>
  );
};
