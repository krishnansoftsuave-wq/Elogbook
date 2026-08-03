/**
 * Series colour for every chart, as tokens rather than values.
 *
 * The prototype passes a hex per datum (`{label, value, color:'#0E8C81'}`,
 * app-source.txt 756). Three reasons that cannot cross over: `.claude/rules/01`
 * forbids a hardcoded colour in a component, a hex cannot respond to dark mode,
 * and `globals.css` already defines this exact ramp — `--chart-1` through
 * `--chart-9`, once per theme — precisely so charts do not need their own
 * palette. Every tone below must have an entry in both blocks *and* a
 * `--color-chart-N` mapping in `@theme`, or its Tailwind class resolves to
 * nothing and the series renders unpainted.
 *
 * The class maps are written out in full rather than built by interpolation
 * (`` `fill-${tone}` ``) because Tailwind scans source text: a class it never
 * sees written is a class it never generates, and the chart would render
 * unstyled.
 */

/**
 * 1–5 are the **categorical** ramp — the one `toneAt` walks for a series that
 * has no meaning attached to its colour.
 *
 * 6 and 7 are deliberately **outside** that rotation, because they exist for
 * ordered scales: a RAG breakdown needs a yellow between amber and green, and a
 * neutral for "no date". Leaving them out of `CHART_TONES` keeps `toneAt` from
 * handing a "no data" grey to the sixth series of an ordinary chart.
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

/**
 * Tones outside the rotation. Assign these by meaning, never by position.
 *
 * 6 and 7 serve ordered scales (a RAG ramp needs a yellow between amber and
 * green, and a neutral for "no date"). 8 and 9 exist because the production
 * trend plots five measures at once and 1–5 has no blue and no purple — two of
 * its lines would otherwise have reused a hue already carrying another measure.
 */
export const SCALE_TONES = [
  "chart-6",
  "chart-7",
  "chart-8",
  "chart-9",
] as const;

export type ChartTone =
  (typeof CHART_TONES)[number] | (typeof SCALE_TONES)[number];

/*
  ⚠️ `FILL_BY_TONE` and `STROKE_BY_TONE` used to live here, mapping each tone to
  a `fill-chart-N` / `stroke-chart-N` class. Both were dead: the move to Recharts
  means every chart hands the library a colour *string* (`VAR_BY_TONE`, or
  `var(--color-<key>)` via `ChartContainer`) rather than a class on an SVG node,
  and nothing had imported either map since. Neither `noUnusedLocals` nor ESLint
  flags an unused *export*, so 18 dead entries would have kept accumulating —
  including the four added when `--chart-8` and `--chart-9` landed.

  `SWATCH_BY_TONE` below is genuinely live: the legend swatches are HTML, outside
  the SVG, so they take a Tailwind class.
*/

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

/**
 * The CSS variable behind a tone, for libraries that want a colour *string*
 * rather than a class.
 *
 * Recharts takes `fill`/`stroke` as props and resolves them as CSS values, so
 * `var(--chart-1)` works and keeps the light/dark switch where it belongs — in
 * `globals.css`. This is the whole reason the switch to Recharts did not cost
 * the theme: no component ever names a colour, exactly as `.claude/rules/01`
 * requires.
 */
/**
 * A CSS-identifier-safe key for a series, derived from its position.
 *
 * shadcn's `ChartContainer` emits one custom property per config key —
 * `--color-<key>` — and Recharts is handed `var(--color-<key>)` as a fill. A
 * key is therefore a **CSS identifier**, and a human series name is not: this
 * chart's buckets are "Due ≤ 7 days" and "Due > 30 days", which produced
 * `var(--color-Due ≤ 7 days)`. That is not a parse error, it is an *unresolved*
 * variable, so every bar fell back to black and the chart looked broken rather
 * than misconfigured.
 *
 * Index-based rather than a slug of the name: two buckets could slug to the
 * same identifier, and a silent colour collision is harder to notice than a
 * wrong one. The readable name still reaches the tooltip and legend through
 * `config[key].label`.
 */
export const seriesKey = (index: number): string => `s${index}`;

export const VAR_BY_TONE: Record<ChartTone, string> = {
  "chart-1": "var(--chart-1)",
  "chart-2": "var(--chart-2)",
  "chart-3": "var(--chart-3)",
  "chart-4": "var(--chart-4)",
  "chart-5": "var(--chart-5)",
  "chart-6": "var(--chart-6)",
  "chart-7": "var(--chart-7)",
  "chart-8": "var(--chart-8)",
  "chart-9": "var(--chart-9)",
};
