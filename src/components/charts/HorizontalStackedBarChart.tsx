import {
  ChartDataTable,
  type ChartSeries,
} from "@/components/charts/ChartFrame";
import { apportion, basisClass } from "@/components/charts/proportion";
import type {
  StackedBucket,
  StackedCategory,
} from "@/components/charts/StackedBarChart";
import { SWATCH_BY_TONE } from "@/components/charts/tones";
import { cn } from "@/lib/utils";

/**
 * A 100%-stacked horizontal bar per category — the prototype's `iHStack`
 * (app-source.txt 1888–1895), used by the Compliance & Due-Date Status
 * section of Trends & KPIs (`dueSection`, line 1927).
 *
 * **HTML/flexbox, not SVG — and that is a bug fix, not a preference.** This
 * was an `<svg viewBox="0 0 640 h">` with `w-full`, which means the browser
 * applies a viewport transform of `container_width / 640` to *everything*
 * inside it, typography included. In a ~1280px card that is ~2×: `height="22"`
 * painted as 44px, `font-size="10"` as 20px, `text-xs` as 24px — and at 375px
 * the same source shrank to ~5px text. No amount of tuning the numbers
 * converges, because the numbers were already right and were being multiplied.
 * The prototype has no such layer: lines 1888–1895 are `this.h('div', …)`
 * calls with percentage widths. A horizontal stacked bar has no axes and no
 * curves, so SVG bought nothing and cost the scaling bug. Every size below is
 * now a real CSS pixel at every breakpoint.
 *
 * `StackedBucket` / `StackedCategory` are still reused from `StackedBarChart`:
 * a bucket is `{ name, tone }` and a category is `{ label, values }` whichever
 * axis the bar runs along.
 *
 * **Geometry, all from `iHStack` and all literal now.** Label column 104px
 * (`w-26`), bar 22px tall (`h-5.5`), 11px between rows (`gap-2.75`), 12px
 * between the three columns (`gap-3`), total column 64px (`w-16`), track
 * radius 5px (`rounded-bar`), label and total 12px/600 (`text-xs`), the
 * in-segment count 10px/700 (`text-3xs`). These are theme-scale steps rather
 * than arbitrary `[22px]` brackets — Tailwind's spacing scale is 4px per step,
 * so the prototype's numbers land on it exactly.
 *
 * **Segment widths come from `apportion`**, not from rounding each share
 * independently: the segments must total exactly 100% or the last one
 * overflows the rounded track or leaves a sliver of it showing. `overflow-hidden`
 * on the track is what rounds the first and last segment and leaves the joins
 * between them square — the same thing `iHStack`'s own
 * `borderRadius:5, overflow:hidden` does, and the reason the SVG version
 * needed a hand-built `<clipPath>` per row.
 *
 * **Per-segment counts** print inside the fill, only when `>= 1`
 * (`v>=1?v:''`, line 1892), in `text-on-brand` — a real theme token (the brand
 * bar's own text colour, fixed white by design and not flipped by dark mode),
 * so this stays a token reference rather than a hardcoded `white`. Each
 * segment also carries a `title`, giving the same information as a hover
 * tooltip, alongside the unconditional `ChartDataTable`.
 *
 * **Responsive.** The reference is authored at 1440 only. The 104px label
 * column and 64px total column are what the prototype fixes them at and what
 * this uses from `sm` up; below `sm` both narrow (80px / 56px) and the gaps
 * tighten to 8px, because holding 104+64+24 of fixed chrome inside a ~311px
 * card at 375px leaves the bar itself too narrow to read. Narrowing was chosen
 * over stacking the label above the bar: stacking doubles the row height and
 * turns a seven-row chart into a screenful of scrolling for the same data.
 */

interface HorizontalStackedBarChartProps {
  label: string;
  buckets: readonly StackedBucket[];
  categories: readonly StackedCategory[];
  /** Appended after the row total, e.g. "18 open". Defaults to "open". */
  totalSuffix?: string;
  /** Header for the accessible table's first column. */
  categoryHeader?: string;
  className?: string;
}

export const HorizontalStackedBarChart = ({
  label,
  buckets,
  categories,
  totalSuffix = "open",
  categoryHeader = "Category",
  className,
}: HorizontalStackedBarChartProps) => {
  /** Same normalisation `StackedBarChart` applies, for the same reason: a
   * category with more values than buckets must not silently disagree with
   * itself across the drawing, the totals and the accessible table. */
  const valuesOf = (category: StackedCategory): number[] =>
    buckets.map((_, index) => category.values[index] ?? 0);

  const series: ChartSeries[] = buckets.map((bucket, bucketIndex) => ({
    name: bucket.name,
    data: categories.map((category) => ({
      label: category.label,
      value: valuesOf(category)[bucketIndex] ?? 0,
    })),
  }));

  return (
    <div className={cn("w-full", className)}>
      <ul className="mb-3.5 flex flex-wrap gap-x-4 gap-y-1.5">
        {buckets.map((bucket) => (
          <li
            key={bucket.name}
            className="flex items-center gap-1.75 text-2xs text-muted-foreground"
          >
            <span
              className={cn(
                "size-2.75 shrink-0 rounded-xs",
                SWATCH_BY_TONE[bucket.tone]
              )}
              aria-hidden
            />
            {bucket.name}
          </li>
        ))}
      </ul>

      {/*
        `role="img"` makes this a leaf in the accessibility tree, so the label
        is announced once and the dozens of segments inside are not — the same
        contract `ChartFrame` gives its `<svg>`, and the reason the numbers can
        be plain text here without being read twice.
      */}
      <div
        role="img"
        aria-label={label}
        className="flex flex-col gap-2.75"
        data-slot="chart-rows"
      >
        {categories.map((category) => {
          const values = valuesOf(category);
          const shares = apportion(values);
          const total = values.reduce((sum, value) => sum + value, 0);

          return (
            <div
              key={category.label}
              className="flex items-center gap-2 sm:gap-3"
            >
              <span className="w-20 flex-none text-right text-xs font-semibold text-foreground sm:w-26">
                {category.label}
              </span>

              {/* The track. `overflow-hidden` is what clips the square-edged
                  segments to the rounded ends. */}
              <div className="flex h-5.5 min-w-0 flex-1 overflow-hidden rounded-bar bg-muted">
                {shares.map((share, bucketIndex) => {
                  const bucket = buckets[bucketIndex];
                  if (!bucket || share <= 0) return null;
                  const value = values[bucketIndex] ?? 0;

                  return (
                    <div
                      key={bucket.name}
                      title={`${bucket.name}: ${value}`}
                      className={cn(
                        "flex shrink-0 grow-0 items-center justify-center",
                        basisClass(share),
                        SWATCH_BY_TONE[bucket.tone]
                      )}
                    >
                      {value >= 1 ? (
                        <span className="text-3xs font-bold text-on-brand">
                          {value}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <span className="w-14 flex-none text-right text-xs text-muted-foreground sm:w-16">
                <span className="font-semibold text-foreground">{total}</span>{" "}
                {totalSuffix}
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
    </div>
  );
};
