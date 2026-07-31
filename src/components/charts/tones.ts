/**
 * Series colour for every chart, as tokens rather than values.
 *
 * The prototype passes a hex per datum (`{label, value, color:'#0E8C81'}`,
 * app-source.txt 756). Three reasons that cannot cross over: `.claude/rules/01`
 * forbids a hardcoded colour in a component, a hex cannot respond to dark mode,
 * and `globals.css` already defines this exact ramp for both themes
 * (`--chart-1..5`, lines 117–121 and 201–205) precisely so charts do not need
 * their own palette.
 *
 * The class maps are written out in full rather than built by interpolation
 * (`` `fill-${tone}` ``) because Tailwind scans source text: a class it never
 * sees written is a class it never generates, and the chart would render
 * unstyled.
 */

export const CHART_TONES = [
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
] as const;

export type ChartTone = (typeof CHART_TONES)[number];

/** SVG `fill` — bars, wedges, any filled shape. */
export const FILL_BY_TONE: Record<ChartTone, string> = {
  "chart-1": "fill-chart-1",
  "chart-2": "fill-chart-2",
  "chart-3": "fill-chart-3",
  "chart-4": "fill-chart-4",
  "chart-5": "fill-chart-5",
};

/** SVG `stroke` — the donut's ring segments. */
export const STROKE_BY_TONE: Record<ChartTone, string> = {
  "chart-1": "stroke-chart-1",
  "chart-2": "stroke-chart-2",
  "chart-3": "stroke-chart-3",
  "chart-4": "stroke-chart-4",
  "chart-5": "stroke-chart-5",
};

/** HTML `background` — legend swatches, which sit outside the SVG. */
export const SWATCH_BY_TONE: Record<ChartTone, string> = {
  "chart-1": "bg-chart-1",
  "chart-2": "bg-chart-2",
  "chart-3": "bg-chart-3",
  "chart-4": "bg-chart-4",
  "chart-5": "bg-chart-5",
};

/**
 * Assigns tones around the ramp for a series with no explicit colour. Wraps, so
 * a six-category chart reuses `chart-1` rather than rendering the sixth
 * unstyled — repetition is a legibility problem, an invisible bar is a bug.
 */
export const toneAt = (index: number): ChartTone =>
  CHART_TONES[index % CHART_TONES.length] ?? "chart-1";
