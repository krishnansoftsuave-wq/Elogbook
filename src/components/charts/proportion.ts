/**
 * Proportional sizing for HTML charts, as utility classes.
 *
 * **Why this file exists.** A bar's length is continuous data, and the two
 * obvious ways to express it are both closed here: `eslint.config.mjs:57` bans
 * the `style` JSX attribute (so `style={{ width: '37%' }}` and the
 * `style={{ '--w': … }}` custom-property trick are out), and a template-built
 * class (`` `basis-[${n}%]` ``) is invisible to Tailwind's scanner, which reads
 * source text rather than running it — so the class silently never gets
 * generated.
 *
 * What is left is a finite, literal set of classes the scanner can see. That is
 * `PERCENT_BASIS`: one `basis-[n%]` for every whole percent. `flex-basis` is
 * used rather than `w-`/`h-` because it is **axis-relative** — the same class
 * sets a segment's width inside a `flex-row` (a horizontal stacked bar) and its
 * height inside a `flex-col` (a column chart), so one table serves both charts
 * instead of two that must be kept in step.
 *
 * Whole percents, not tenths: 1% of a 1120px bar is ~11px of *total* width
 * shared across the row, and `apportion` below removes the only artefact that
 * granularity would otherwise cause.
 *
 * This replaces the SVG geometry `scale.ts` computes for these two charts.
 * `scale.ts`'s own header explains why SVG was chosen originally — the `style`
 * ban — and that reasoning held for line and pie charts, which genuinely need
 * curves and a coordinate space. It did not hold for bar charts: a `viewBox`
 * scales *everything* in it, typography included, so a `font-size="10"` label
 * rendered at 20px in a 1280px-wide container and at 5px on mobile. Flexbox has
 * no scaling layer, so a 12px label is 12px at every breakpoint.
 */

/**
 * `PERCENT_BASIS[n]` is the Tailwind class for `flex-basis: n%`, for
 * `n` in `0…100`. Written out because Tailwind's scanner must find each class
 * as literal text; generating them in a loop produces classes that exist at
 * runtime and not in the stylesheet.
 */
export const PERCENT_BASIS: readonly string[] = [
  "basis-[0%]",
  "basis-[1%]",
  "basis-[2%]",
  "basis-[3%]",
  "basis-[4%]",
  "basis-[5%]",
  "basis-[6%]",
  "basis-[7%]",
  "basis-[8%]",
  "basis-[9%]",
  "basis-[10%]",
  "basis-[11%]",
  "basis-[12%]",
  "basis-[13%]",
  "basis-[14%]",
  "basis-[15%]",
  "basis-[16%]",
  "basis-[17%]",
  "basis-[18%]",
  "basis-[19%]",
  "basis-[20%]",
  "basis-[21%]",
  "basis-[22%]",
  "basis-[23%]",
  "basis-[24%]",
  "basis-[25%]",
  "basis-[26%]",
  "basis-[27%]",
  "basis-[28%]",
  "basis-[29%]",
  "basis-[30%]",
  "basis-[31%]",
  "basis-[32%]",
  "basis-[33%]",
  "basis-[34%]",
  "basis-[35%]",
  "basis-[36%]",
  "basis-[37%]",
  "basis-[38%]",
  "basis-[39%]",
  "basis-[40%]",
  "basis-[41%]",
  "basis-[42%]",
  "basis-[43%]",
  "basis-[44%]",
  "basis-[45%]",
  "basis-[46%]",
  "basis-[47%]",
  "basis-[48%]",
  "basis-[49%]",
  "basis-[50%]",
  "basis-[51%]",
  "basis-[52%]",
  "basis-[53%]",
  "basis-[54%]",
  "basis-[55%]",
  "basis-[56%]",
  "basis-[57%]",
  "basis-[58%]",
  "basis-[59%]",
  "basis-[60%]",
  "basis-[61%]",
  "basis-[62%]",
  "basis-[63%]",
  "basis-[64%]",
  "basis-[65%]",
  "basis-[66%]",
  "basis-[67%]",
  "basis-[68%]",
  "basis-[69%]",
  "basis-[70%]",
  "basis-[71%]",
  "basis-[72%]",
  "basis-[73%]",
  "basis-[74%]",
  "basis-[75%]",
  "basis-[76%]",
  "basis-[77%]",
  "basis-[78%]",
  "basis-[79%]",
  "basis-[80%]",
  "basis-[81%]",
  "basis-[82%]",
  "basis-[83%]",
  "basis-[84%]",
  "basis-[85%]",
  "basis-[86%]",
  "basis-[87%]",
  "basis-[88%]",
  "basis-[89%]",
  "basis-[90%]",
  "basis-[91%]",
  "basis-[92%]",
  "basis-[93%]",
  "basis-[94%]",
  "basis-[95%]",
  "basis-[96%]",
  "basis-[97%]",
  "basis-[98%]",
  "basis-[99%]",
  "basis-[100%]",
];

/** Clamps to the table's bounds so an out-of-range percent cannot yield `undefined`. */
export const basisClass = (percent: number): string =>
  PERCENT_BASIS[Math.min(100, Math.max(0, Math.round(percent)))] ??
  "basis-[0%]";

/**
 * Splits values into whole percentages that sum to **exactly** 100.
 *
 * Rounding each share independently does not: five buckets rounded to the
 * nearest percent can total 98 or 102, and in a 100%-stacked bar that surplus
 * or shortfall is directly visible as the last segment overflowing the rounded
 * track or leaving a sliver of empty track behind it. This is the largest
 * remainder (Hamilton) method — floor everything, then hand the leftover
 * percentage points to the buckets with the largest discarded fractions.
 *
 * Zero-valued buckets never receive a remainder point: a bucket with no items
 * must render no segment at all, and giving it 1% would draw a stripe for
 * something that does not exist.
 *
 * An all-zero (or empty) input returns all zeros rather than dividing by zero —
 * a category with nothing open is a normal state, not an error.
 */
export const apportion = (values: readonly number[]): number[] => {
  const safe = values.map((value) =>
    Number.isFinite(value) && value > 0 ? value : 0
  );
  const total = safe.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return safe.map(() => 0);

  const exact = safe.map((value) => (value / total) * 100);
  const result = exact.map(Math.floor);
  let remainder = 100 - result.reduce((sum, value) => sum + value, 0);

  const byLargestFraction = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (const { index } of byLargestFraction) {
    if (remainder <= 0) break;
    if (safe[index] === 0) continue;
    result[index] = (result[index] ?? 0) + 1;
    remainder -= 1;
  }

  return result;
};

/**
 * One value as a whole percentage of `max` — a column's height against the
 * chart's tallest, where shares do **not** sum to 100 and so `apportion` does
 * not apply.
 */
export const percentOfMax = (value: number, max: number): number => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (!Number.isFinite(max) || max <= 0) return 0;
  return Math.min(100, Math.round((value / max) * 100));
};

/**
 * A column chart's tallest possible bar, in pixels — `iBar`'s own
 * `height:120` (`app-source.txt` 1946). `BAR_HEIGHT_CLASS`/`barHeightClass`
 * below express any shorter bar as a fraction of this.
 */
export const PLOT_HEIGHT = 120;

/**
 * `BAR_HEIGHT_CLASS[n]` is the Tailwind class for a **literal** `n * 4px`
 * height, for `n` in `0…30` (0 to `PLOT_HEIGHT`, 4px per Tailwind spacing
 * step). Deliberately an absolute `h-N`, not a `PERCENT_BASIS`-style
 * `flex-basis` percentage: a percentage height only resolves against a flex
 * container whose *own* height is definite, and the bar's parent column is
 * intentionally `auto`-height (see `StackedBarChart.tsx`'s own comment on why
 * — briefly, so a short column's value label sits directly above its own
 * bar rather than at the top of a fixed-height well every column shares).
 * With no definite ancestor to be a percentage *of*, `basisClass` would
 * silently collapse to 0 here; an absolute height has no such dependency.
 * Written out for the same reason `PERCENT_BASIS` is: Tailwind's scanner
 * needs each class as literal text.
 */
export const BAR_HEIGHT_CLASS: readonly string[] = [
  "h-0",
  "h-1",
  "h-2",
  "h-3",
  "h-4",
  "h-5",
  "h-6",
  "h-7",
  "h-8",
  "h-9",
  "h-10",
  "h-11",
  "h-12",
  "h-13",
  "h-14",
  "h-15",
  "h-16",
  "h-17",
  "h-18",
  "h-19",
  "h-20",
  "h-21",
  "h-22",
  "h-23",
  "h-24",
  "h-25",
  "h-26",
  "h-27",
  "h-28",
  "h-29",
  "h-30",
];

/**
 * A 0–100 percent (`percentOfMax`'s own output) as the nearest 4px-step
 * absolute height class. 31 steps over 120px is ~4px resolution — finer than
 * `PERCENT_BASIS`'s whole-percent steps would need to be for a chart this
 * size, since a percentage point of 120px is already sub-pixel.
 */
export const barHeightClass = (percent: number): string => {
  const step = Math.round((Math.min(100, Math.max(0, percent)) / 100) * 30);
  return BAR_HEIGHT_CLASS[step] ?? "h-0";
};
