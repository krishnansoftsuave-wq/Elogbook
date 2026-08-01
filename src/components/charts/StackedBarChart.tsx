"use client";

import {
  ChartDataTable,
  type ChartSeries,
} from "@/components/charts/ChartFrame";
import {
  apportion,
  barHeightClass,
  basisClass,
  percentOfMax,
} from "@/components/charts/proportion";
import { niceMax } from "@/components/charts/scale";
import { SWATCH_BY_TONE, type ChartTone } from "@/components/charts/tones";
import { cn } from "@/lib/utils";

/**
 * A stacked column chart — the prototype's `iStackBar` (app-source.txt
 * 529–545) and, for the single-bucket case, `iBar` (`oosArea`'s call, line
 * 1946: `{height:120, barW:52, unit:'items'}`).
 *
 * **HTML/flexbox, not SVG — the same structural fix `HorizontalStackedBarChart`
 * needed.** This was an `<svg viewBox="0 0 640 174">` with `w-full`, so the
 * browser scaled everything inside it by `container_width / 640`. `text-xs` was
 * not 12px; it was 12 *user units*, growing and shrinking with the viewport,
 * which is why the typography matched at no single size. A column chart needs
 * no coordinate space — a column is a box with a proportional height — so the
 * chart is now boxes, and 12px means 12px at 375, 768 and 1440 alike.
 *
 * **Geometry, from `iBar`'s own call.** Container 154px tall (`h-38.5`, the
 * prototype's `H+34`), columns 14px apart (`gap-3.5`), 6px between a column's
 * three parts (`gap-1.5`), bars capped at 52px wide (`max-w-13`) but free to
 * shrink below it so a 375px card never overflows, top corners rounded 5px
 * (`rounded-t-bar`). The value label is 12px/700 (`text-xs`) and the category
 * label 10px/500 (`text-3xs`) with a 26px floor (`min-h-6.5`) so a wrapping
 * two-line name does not shove its neighbours' baselines out of line.
 *
 * **A column has no height of its own — it shrink-wraps, and that is the
 * fix for a real bug.** An earlier version gave the column `h-full` plus an
 * inner `flex-1` "well" the bar grew inside; the well absorbed 100% of the
 * container's spare vertical space regardless of the bar's own height, so
 * the value label above it sat at the same fixed height for every column —
 * a short bar's label floated far above it instead of sitting on top of it.
 * `barHeightClass` (`proportion.ts`) replaces that well: it gives the bar an
 * **absolute** height (`h-N`, literal pixels), not a percentage, so the bar
 * is the only thing in the column whose size varies, the column's total
 * height is exactly `label + bar + category label`, and the row's own
 * `items-end` (already correct — it was `h-full` on the child defeating it)
 * bottom-aligns columns of different heights at the category-label baseline.
 * `PLOT_HEIGHT` (120, `iBar`'s own number) is what "the max value" maps to.
 *
 * Bar height is `percentOfMax` against `niceMax` — the prototype's own 1.12
 * headroom factor (`scale.ts`), kept so the tallest column's bar never quite
 * reaches `PLOT_HEIGHT`, leaving room for its value label above. Segment
 * heights *within* a column come from `apportion`, which guarantees they
 * total exactly 100% of the bar's own (now-definite) height rather than 99%
 * or 101% — visible as a gap or an overflow at the rounded cap. That 100%
 * still resolves correctly against `barHeightClass`'s absolute height, even
 * though a percentage wouldn't resolve against the column's auto height one
 * level up. `flex-col-reverse` puts the first bucket at the bottom, where a
 * stack reads from.
 *
 * **Hover** dims every bar to 85% and brightens the hovered one to 100%,
 * bolding its label — `iBar`'s `opacity:hov?1:.85` / `fontWeight:hov?700:500`
 * (lines 462–466), as a CSS `group`/`group-hover` pair rather than React
 * state, since both are static per-hover styling rather than a content change.
 *
 * **Per-category tone and an optional unit both come from `iBar`'s call
 * signature.** `oosArea` colours every column by its own category rather than
 * by a shared bucket, and labels each with a unit ("3 items").
 * `StackedCategory.tone` overrides the bucket's tone for that category —
 * meaningful only for a single-bucket chart where each column wants its own
 * colour; a genuine multi-bucket stack should leave it unset, since there the
 * bucket's tone is what makes the legend meaningful.
 *
 * `onSelect` preserves the prototype's drill-down (`o.onBar`, line 536), but as
 * real `<button>`s outside the `role="img"` subtree rather than a click
 * handler on a `<div>`: the prototype's version is unreachable by keyboard, and
 * an interactive element inside `role="img"` is never surfaced by assistive
 * technology.
 */

export interface StackedBucket {
  /** Legend name for this layer of the stack. */
  name: string;
  tone: ChartTone;
}

export interface StackedCategory {
  label: string;
  /** One value per bucket, in the same order as `buckets`. */
  values: readonly number[];
  /** Overrides the bucket's tone for this category's segment. See the file docblock. */
  tone?: ChartTone;
}

interface StackedBarChartProps {
  label: string;
  buckets: readonly StackedBucket[];
  categories: readonly StackedCategory[];
  /** Drill-down. Renders a focusable button per column when provided. */
  onSelect?: (category: StackedCategory) => void;
  /** Header for the accessible table's first column. */
  categoryHeader?: string;
  /** Appended after each column's printed total, e.g. "3 items". */
  unit?: string;
  /**
   * The bucket legend above the chart. Off by default when there is exactly
   * one bucket and every category supplies its own `tone` — the category
   * labels under each bar already carry that meaning, and a one-row legend
   * reading "● Out of service" tells a reader nothing a per-area colour and
   * label do not already say (`app-source.txt` 1946's own chart has none).
   */
  showLegend?: boolean;
  className?: string;
}

export const StackedBarChart = ({
  label,
  buckets,
  categories,
  onSelect,
  categoryHeader = "Category",
  unit = "",
  showLegend = true,
  className,
}: StackedBarChartProps) => {
  /**
   * `values` is documented as one entry per bucket but nothing enforces it, and
   * three readers used to disagree when it was not: the printed total summed
   * every entry, the drawn stack divided by every entry, and the accessible
   * table read only the first `buckets.length`. A column could print 10, draw
   * the height 5 earns, and tabulate 5. Normalising once here means all three
   * read the same numbers, and a surplus entry is dropped visibly rather than
   * corrupting the geometry.
   */
  const valuesOf = (category: StackedCategory): number[] =>
    buckets.map((_, index) => category.values[index] ?? 0);

  const totals = categories.map((category) =>
    valuesOf(category).reduce((sum, value) => sum + value, 0)
  );
  const max = niceMax(totals);

  // One series per bucket, so the accessible table reads as a real crosstab:
  // a row per category, a column per bucket.
  const series: ChartSeries[] = buckets.map((bucket, bucketIndex) => ({
    name: bucket.name,
    data: categories.map((category) => ({
      label: category.label,
      value: valuesOf(category)[bucketIndex] ?? 0,
    })),
  }));

  return (
    <div className={cn("w-full", className)}>
      {showLegend ? (
        <ul className="mb-3.5 flex flex-wrap gap-x-4 gap-y-1.5">
          {buckets.map((bucket) => (
            <li
              key={bucket.name}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <span
                className={cn(
                  "size-2.5 shrink-0 rounded-xs",
                  SWATCH_BY_TONE[bucket.tone]
                )}
                aria-hidden
              />
              {bucket.name}
            </li>
          ))}
        </ul>
      ) : null}

      <div
        role="img"
        aria-label={label}
        className="flex h-38.5 items-end gap-3.5 px-1 pt-1.5"
        data-slot="chart-columns"
      >
        {categories.map((category, index) => {
          const values = valuesOf(category);
          const total = totals[index] ?? 0;
          const columnHeight = percentOfMax(total, max);
          const shares = apportion(values);

          return (
            <div
              key={category.label}
              className="group flex min-w-0 flex-1 flex-col items-center gap-1.5"
            >
              <span className="text-xs font-bold text-foreground">
                {unit ? `${total} ${unit}` : total}
              </span>

              {/* Absolute height (`barHeightClass`), not a percentage: this
                  column has no height of its own for a percentage to resolve
                  against, by design — see the file docblock. */}
              <div
                className={cn(
                  "mx-auto flex w-full max-w-13 flex-col-reverse overflow-hidden rounded-t-bar opacity-85 transition-opacity group-hover:opacity-100",
                  barHeightClass(columnHeight)
                )}
              >
                {shares.map((share, bucketIndex) => {
                  const bucket = buckets[bucketIndex];
                  if (!bucket || share <= 0) return null;
                  const value = values[bucketIndex] ?? 0;

                  return (
                    <div
                      key={bucket.name}
                      title={`${bucket.name}: ${value}`}
                      className={cn(
                        "w-full shrink-0 grow-0",
                        basisClass(share),
                        SWATCH_BY_TONE[category.tone ?? bucket.tone]
                      )}
                    />
                  );
                })}
              </div>

              <span className="min-h-6.5 text-center text-3xs font-medium text-muted-foreground group-hover:font-bold group-hover:text-foreground">
                {category.label}
              </span>
            </div>
          );
        })}
      </div>

      <ChartDataTable
        label={label}
        series={series}
        categoryHeader={categoryHeader}
      />

      {onSelect && (
        /*
          The drill-down. The prototype hangs a click handler on the column
          `<div>` (line 536), which no keyboard can reach. Real buttons in a row
          that mirrors the columns keeps the interaction reachable and labelled
          without putting interactive elements inside a `role="img"` subtree,
          where assistive technology would never surface them.
        */
        <ul
          // Named for the same reason ChartKindToggle names its group: two of
          // these on one dashboard would otherwise put two identical
          // "B-train 5" buttons in the tab order with nothing tying either to
          // its chart.
          aria-label={`${label} — open a category`}
          className="mt-3 flex flex-wrap gap-1.5"
          data-slot="chart-drilldown"
        >
          {categories.map((category, index) => (
            <li key={category.label}>
              <button
                type="button"
                onClick={() => onSelect(category)}
                className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {category.label}
                <span className="ms-1.5 font-semibold text-foreground tabular-nums">
                  {totals[index] ?? 0}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
