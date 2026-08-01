import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The wrapper every chart primitive renders through.
 *
 * **This closes the prototype's largest documented gap.** `SCREENS.md` lists it
 * plainly: *"Charts have no accessible equivalent — SVG with no labels or table
 * fallback."* `.claude/rules/03` sets the bar at **WCAG 2.1 AA**, and a chart
 * that conveys information only through shape and colour fails 1.1.1
 * (non-text content) outright. Building the fallback once, here, is the only way
 * to guarantee no primitive ships without it — a per-chart convention would be
 * forgotten by the third one.
 *
 * Two things it guarantees:
 *
 * - **`role="img"` + `aria-label`** on the `<svg>`. `role="img"` makes the
 *   element a leaf in the accessibility tree, so the label is announced and the
 *   dozens of `<rect>` and `<circle>` children inside it are not — which is why
 *   no `aria-hidden` is needed here, and why adding one would be wrong: it would
 *   remove the label along with the drawing.
 * - **A visually-hidden `<table>`** carrying the actual series. Screen-reader
 *   users get the numbers, not a summary of them — and because it is real
 *   markup rather than a longer `aria-label`, it is navigable cell by cell.
 *
 * Responsiveness comes from the `viewBox` + `h-auto w-full`: no primitive has a
 * pixel width, so all three engagement breakpoints (375 / 768 / 1440) are the
 * same code path rather than three.
 *
 * NFR-07 note: the drawing is LTR by construction (see `scale.ts`). The table
 * below is ordinary markup and mirrors correctly under `dir="rtl"` for free,
 * so the accessible path needs no RTL work when the Arabic layer lands.
 */

export interface ChartDatum {
  /** Category name — the row header in the accessible table. */
  label: string;
  /** The measured value. */
  value: number;
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
  /** The `viewBox` width in user units — never a rendered pixel width. */
  width: number;
  height: number;
  /** One entry per series. A single-series chart passes an array of one. */
  series: readonly ChartSeries[];
  /** Header for the first column of the accessible table. */
  categoryHeader?: string;
  /** The SVG content. Receives no props — geometry comes from `scale.ts`. */
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

const cellFor = (series: ChartSeries, category: string): string => {
  const datum = series.data.find((candidate) => candidate.label === category);
  if (!datum) return "—";
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
  width,
  height,
  series,
  categoryHeader = "Category",
  children,
  className,
}: ChartFrameProps) => {
  return (
    // A plain `div`, not a `figure`. A `figure` without a `figcaption` is an
    // unnamed group in the accessibility tree, so a screen reader announced
    // "figure", then the image's name, then the identical string again as the
    // table's name. The labelled `role="img"` and the captioned table already
    // carry every semantic the figure was adding.
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        // No width/height attributes: the viewBox plus these classes make the
        // chart fluid, which is what "no fixed pixel widths" means in practice.
        className="block h-auto w-full"
        role="img"
        aria-label={label}
      >
        {children}
      </svg>

      <ChartDataTable
        label={label}
        series={series}
        categoryHeader={categoryHeader}
      />
    </div>
  );
};
