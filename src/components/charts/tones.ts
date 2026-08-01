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
  /**
   * Added for the Trends & KPIs production strip (`sparkCard`,
   * app-source.txt 1909–1914). Its five series are teal, blue, green, purple
   * and amber; `chart-1..5` above already carries teal/amber/green but no
   * blue or purple, and reusing one of the five would put two of the five KPI
   * cards in the same colour side by side. See `globals.css` for the two
   * tokens' derivation.
   */
  "chart-6",
  "chart-7",
  /**
   * Added for the Trends & KPIs compliance chart's RAG ramp (`RAG()`,
   * app-source.txt 546): "Due ≤ 30 days" is its own gold/yellow
   * (`#E0B000`) — visually distinct from "Due ≤ 7 days"'s amber
   * (`chart-3`, `#D97706`) — and "No date" is a neutral grey (`#9BADA9`).
   * Neither existed in `chart-1..7`: reusing `chart-6` (blue) for the
   * yellow slot and `chart-7` (purple) for the grey slot is what produced
   * the scrambled compliance legend this pair fixes. See `globals.css` for
   * derivation.
   */
  "chart-8",
  "chart-9",
] as const;

export type ChartTone = (typeof CHART_TONES)[number];

/** SVG `fill` — bars, wedges, any filled shape. */
export const FILL_BY_TONE: Record<ChartTone, string> = {
  "chart-1": "fill-chart-1",
  "chart-2": "fill-chart-2",
  "chart-3": "fill-chart-3",
  "chart-4": "fill-chart-4",
  "chart-5": "fill-chart-5",
  "chart-6": "fill-chart-6",
  "chart-7": "fill-chart-7",
  "chart-8": "fill-chart-8",
  "chart-9": "fill-chart-9",
};

/** SVG `stroke` — the donut's ring segments. */
export const STROKE_BY_TONE: Record<ChartTone, string> = {
  "chart-1": "stroke-chart-1",
  "chart-2": "stroke-chart-2",
  "chart-3": "stroke-chart-3",
  "chart-4": "stroke-chart-4",
  "chart-5": "stroke-chart-5",
  "chart-6": "stroke-chart-6",
  "chart-7": "stroke-chart-7",
  "chart-8": "stroke-chart-8",
  "chart-9": "stroke-chart-9",
};

/** HTML `background` — legend swatches, which sit outside the SVG. */
export const SWATCH_BY_TONE: Record<ChartTone, string> = {
  "chart-1": "bg-chart-1",
  "chart-2": "bg-chart-2",
  "chart-3": "bg-chart-3",
  "chart-4": "bg-chart-4",
  "chart-5": "bg-chart-5",
  "chart-6": "bg-chart-6",
  "chart-7": "bg-chart-7",
  "chart-8": "bg-chart-8",
  "chart-9": "bg-chart-9",
};

/**
 * Assigns tones around the ramp for a series with no explicit colour. Wraps, so
 * a six-category chart reuses `chart-1` rather than rendering the sixth
 * unstyled — repetition is a legibility problem, an invisible bar is a bug.
 */
export const toneAt = (index: number): ChartTone =>
  CHART_TONES[index % CHART_TONES.length] ?? "chart-1";
