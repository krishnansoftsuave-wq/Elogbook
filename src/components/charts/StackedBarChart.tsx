"use client";

import { ChartFrame, type ChartSeries } from "@/components/charts/ChartFrame";

import {
  bands,
  barTop,
  linearHeight,
  niceMax,
  plotArea,
  stack,
} from "@/components/charts/scale";
import {
  FILL_BY_TONE,
  SWATCH_BY_TONE,
  type ChartTone,
} from "@/components/charts/tones";
import { cn } from "@/lib/utils";

/**
 * A stacked column chart — the prototype's `iStackBar` (app-source.txt 529–545).
 *
 * **The port changes the rendering technology, not the design.** The prototype
 * builds each column from nested `<div>`s with a computed pixel height
 * (`style:{height: ...+'px'}`, line 541). `eslint.config.mjs:56` bans the
 * `style` JSX attribute outright, and a continuous data range cannot be
 * expressed as a finite set of utility classes — so the column becomes SVG
 * `<rect>`s, where the geometry is an attribute. That is the constraint;
 * `viewBox` responsiveness and one uniform `role="img"` wrapper are the payoff.
 *
 * Colour comes from the `--chart-*` ramp rather than the prototype's per-bucket
 * hex, and every geometry decision comes from `scale.ts` so the RTL retrofit
 * stays a single wrapper transform (NFR-07).
 *
 * `onSelect` preserves the prototype's drill-down (`o.onBar`, line 536), but as
 * a real `<button>` per column rather than a click handler on a `<div>`: the
 * prototype's version is unreachable by keyboard.
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
}

interface StackedBarChartProps {
  label: string;
  buckets: readonly StackedBucket[];
  categories: readonly StackedCategory[];
  /** Drill-down. Renders a focusable button per column when provided. */
  onSelect?: (category: StackedCategory) => void;
  /** Header for the accessible table's first column. */
  categoryHeader?: string;
  className?: string;
}

const WIDTH = 640;
const HEIGHT = 260;
const PADDING = { top: 20, right: 8, bottom: 44, left: 8 };
const MAX_BAR_WIDTH = 56;

export const StackedBarChart = ({
  label,
  buckets,
  categories,
  onSelect,
  categoryHeader = "Category",
  className,
}: StackedBarChartProps) => {
  const plot = plotArea(WIDTH, HEIGHT, PADDING);

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
  const slots = bands(plot, categories.length, 0.34, MAX_BAR_WIDTH);

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
    <div className={cn("flex flex-col gap-3", className)}>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {buckets.map((bucket) => (
          <li
            key={bucket.name}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <span
              className={cn(
                "size-2.5 shrink-0 rounded-sm",
                SWATCH_BY_TONE[bucket.tone]
              )}
              aria-hidden
            />
            {bucket.name}
          </li>
        ))}
      </ul>

      <ChartFrame
        label={label}
        width={WIDTH}
        height={HEIGHT}
        series={series}
        categoryHeader={categoryHeader}
      >
        {categories.map((category, index) => {
          const slot = slots[index];
          const total = totals[index] ?? 0;
          if (!slot) return null;

          const columnHeight = linearHeight(total, max, plot.height);
          const segments = stack(plot, valuesOf(category), columnHeight);

          return (
            <g key={category.label}>
              {segments.map((segment, bucketIndex) => {
                const bucket = buckets[bucketIndex];
                if (!bucket || segment.height <= 0) return null;

                return (
                  <rect
                    key={bucket.name}
                    x={slot.x}
                    y={segment.y}
                    width={slot.width}
                    height={segment.height}
                    className={FILL_BY_TONE[bucket.tone]}
                  />
                );
              })}

              {/* Column total, above the stack. */}
              <text
                x={slot.center}
                y={barTop(plot, columnHeight) - 6}
                textAnchor="middle"
                className="fill-foreground text-xs font-semibold"
              >
                {total}
              </text>

              {/* Category label, below the baseline. */}
              <text
                x={slot.center}
                y={plot.y + plot.height + 18}
                textAnchor="middle"
                className="fill-muted-foreground text-2xs"
              >
                {category.label}
              </text>
            </g>
          );
        })}
      </ChartFrame>

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
          className="flex flex-wrap gap-1.5"
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
