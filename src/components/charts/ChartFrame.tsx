import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The wrapper every chart primitive renders through.
 *
 * **This closes the prototype's largest documented gap.** `SCREENS.md` lists it
 * plainly: *"Charts have no accessible equivalent — SVG with no labels or table
 * fallback."* `.claude/rules/03` sets the bar at **WCAG 2.1 AA**, and a chart
 * that conveys information only through shape and colour fails 1.1.1
 * (non-text content) outright.
 *
 * ## Why it survived the move to Recharts
 *
 * Recharts draws the chart now, so this file no longer owns an `<svg>`. What it
 * still owns is the part **no chart library provides**: a real `<table>` of the
 * underlying series. Recharts renders accessible-ish SVG, but a screen-reader
 * user gets shapes, not numbers — so dropping this on the way to a library
 * would have traded a WCAG requirement for a dependency. Keeping it means the
 * accessibility contract is identical before and after the switch, which is why
 * every test that asserted it still passes unchanged.
 *
 * Two things it guarantees:
 *
 * - **`role="img"` + `aria-label`** on the drawing. `role="img"` makes the
 *   element a leaf in the accessibility tree, so the label is announced and the
 *   dozens of shapes Recharts renders inside it are not — which is also what
 *   stops a hover tooltip being announced as stray text.
 * - **A visually-hidden `<table>`** carrying the actual series. Screen-reader
 *   users get the numbers, not a summary of them — and because it is real
 *   markup rather than a longer `aria-label`, it is navigable cell by cell.
 *
 * NFR-07 note: the table is ordinary markup and mirrors correctly under
 * `dir="rtl"` for free. Recharts' own RTL support is partial and remains work
 * owed when the Arabic layer lands — the library did not solve that for us.
 */

export interface ChartDatum {
  /** Category name — the row header in the accessible table. */
  label: string;
  /**
   * The measured value, or `null` where the series has no reading for this
   * label. `null` is not zero, and the table must not print it as one — see
   * `valueAt` in `LineChart`.
   */
  value: number | null;
  /**
   * Formatted value for the table, when the raw number needs a unit or a
   * percentage alongside it. Falls back to `value`.
   */
  display?: string;
}

export interface ChartSeries {
  /** Series name — a column header when there is more than one series. */
  name: string;
  data: readonly ChartDatum[];
}

interface ChartFrameProps {
  /**
   * What the chart shows, as a sentence. Becomes the `aria-label` and the
   * table's `<caption>`, so it must read as a description rather than a title:
   * "Pending actions by status" rather than "Status".
   */
  label: string;
  /** One entry per series. A single-series chart passes an array of one. */
  series: readonly ChartSeries[];
  /** Header for the first column of the accessible table. */
  categoryHeader?: string;
  /** The chart itself — a Recharts tree wrapped in `ChartContainer`. */
  children: ReactNode;
  className?: string;
}

/**
 * Every category across every series, in first-seen order. A stacked chart may
 * have a series that skips a category, and the table still needs a row for it.
 */
const categoriesOf = (series: readonly ChartSeries[]): string[] => {
  const seen = new Set<string>();
  for (const entry of series) {
    for (const datum of entry.data) seen.add(datum.label);
  }
  return [...seen];
};

/**
 * An em dash for both kinds of absence — no datum at all, and a datum whose
 * value is `null`. The second matters: printing `null` as "0" would make the
 * accessible table state a reading that was never taken, which is the one thing
 * this table exists to avoid.
 */
const cellFor = (series: ChartSeries, category: string): string => {
  const datum = series.data.find((candidate) => candidate.label === category);
  if (!datum || datum.value === null) return "—";
  return datum.display ?? String(datum.value);
};

/**
 * The accessible equivalent, on its own so a chart that is **not** an `<svg>`
 * can render the identical markup.
 *
 * `HorizontalStackedBarChart` and `StackedBarChart` are HTML/flexbox rather
 * than SVG — a `viewBox` scales its contents, so their typography grew and
 * shrank with the container — but the fallback they owe a screen-reader user
 * is exactly the same table, so it lives here rather than being reimplemented
 * (and drifting) in each. `ChartFrame` below renders this unchanged.
 */
export const ChartDataTable = ({
  label,
  series,
  categoryHeader = "Category",
}: Pick<ChartFrameProps, "label" | "series" | "categoryHeader">) => {
  const categories = categoriesOf(series);

  return (
    /*
      `sr-only` rather than `hidden`: a hidden element is removed from the
      accessibility tree, which would defeat the entire point of building it.

      `table-fixed` alongside it: `sr-only`'s `position:absolute; width:1px`
      does not actually constrain a `<table>`. `table-layout:auto` (the
      default) treats an explicit width as a minimum, not a cap, once
      `white-space:nowrap` (also part of `sr-only`) forbids wrapping any
      cell — so the table renders at its full unwrapped content width
      regardless. That box is out of normal flow (fine for sibling layout)
      but still enlarges the page's own scrollable area once it extends
      past the viewport (`position:absolute` does not exempt it). A
      five-plus-column crosstab (`HorizontalStackedBarChart`'s table) was
      wide enough to trip this at 375px — `table-fixed` makes the table
      honour the 1px width for real, so the (invisible, already
      `overflow:hidden`) excess is clipped instead of expanding the page.
    */
    <table className="sr-only table-fixed">
      <caption>{label}</caption>
      <thead>
        <tr>
          <th scope="col">{categoryHeader}</th>
          {series.map((entry) => (
            <th key={entry.name} scope="col">
              {entry.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {categories.map((category) => (
          <tr key={category}>
            <th scope="row">{category}</th>
            {series.map((entry) => (
              <td key={entry.name}>{cellFor(entry, category)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export const ChartFrame = ({
  label,
  series,
  categoryHeader = "Category",
  children,
  className,
}: ChartFrameProps) => {
  return (
    // A plain `div`, not a `figure`. A `figure` without a `figcaption` is an
    // unnamed group in the accessibility tree, so a screen reader announced
    // "figure", then the image's name, then the identical string again as the
    // table's name.
    <div className={cn("w-full", className)}>
      <div role="img" aria-label={label}>
        {children}
      </div>

      <ChartDataTable
        label={label}
        series={series}
        categoryHeader={categoryHeader}
      />
    </div>
  );
};
