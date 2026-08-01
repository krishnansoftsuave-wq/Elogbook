import { KpiTrendCard } from "@/components/charts/KpiTrendCard";
import type { ChartTone } from "@/components/charts/tones";
import type { ProductionKpi } from "@/features/trends/schemas";
import { cn } from "@/lib/utils";

/**
 * The production-KPI strip — the prototype's `prodSection` (app-source.txt
 * 1916–1919), one `KpiTrendCard` (already ported from `sparkCard`) per metric.
 *
 * **Tone mapping.** `ProductionKpi.tone` is a `KpiSeriesTone`
 * (`"series-1"`..`"series-5"`, `features/trends/schemas.ts`) — a wire-safe slot
 * number, deliberately not a colour. `KpiTrendCard` wants a `ChartTone`
 * (`"chart-1"`..`"chart-9"`, `components/charts/tones.ts`). The two vocabularies
 * exist for different reasons (one is "which of five series is this", the other
 * is "which of nine theme colours to paint"), so this is the one place they are
 * stitched together — deliberately **not** a naive `series-N` → `chart-N`
 * ordinal map. The prototype names an exact colour per metric
 * (`prod`, app-source.txt 1909–1914): ADP teal (`#0E8C81`), Spot blue
 * (`#2F73B5`), AVG green (`#1E8E4E`), TLP purple (`#7A3FA0`), Flare amber
 * (`#D97706`) — and `chart-6`/`chart-7` were derived from Spot's blue and
 * TLP's purple specifically (`globals.css`), so an ordinal map that never
 * reaches past `chart-5` can never actually use them. That was the bug: it
 * put ADP and Spot both in the teal family (`chart-1`/`chart-2`) and skipped
 * blue and purple entirely. This map goes straight to the tone each metric's
 * real colour lives at.
 *
 * Grid: `grid-cols-1 sm:grid-cols-2 xl:grid-cols-5` — one column on mobile, two
 * on tablet, all five side by side only once there is room (the prototype's
 * fixed `repeat(5,1fr)` only ever ran at 1440×900).
 *
 * **`lowerIsBetter` is keyed by `tone`, the same slot the colour map above
 * uses** — not by `code`, which `features/trends/schemas.ts` leaves an open
 * string. `series-5` is already permanently committed to Flare by the colour
 * map's own comment; reusing that same slot here rather than matching on the
 * PROVISIONAL string `"Flare"` keeps both facts about "which series is Flare"
 * in one place. `true` for exactly that one: ADP, Spot, AVG and TLP are all
 * production/throughput measures where more is the good outcome; flaring is
 * the opposite, a reduction is what the control room wants to see.
 * `KpiTrendCard`'s own docblock explains why this is a deliberate deviation
 * from the prototype rather than a transcription fix.
 */

const SERIES_TONE_TO_CHART_TONE: Record<ProductionKpi["tone"], ChartTone> = {
  "series-1": "chart-1", // ADP — teal
  "series-2": "chart-6", // Spot — blue
  "series-3": "chart-4", // AVG — green
  "series-4": "chart-7", // TLP — purple
  "series-5": "chart-3", // Flare — amber/orange
};

const LOWER_IS_BETTER_TONE: Record<ProductionKpi["tone"], boolean> = {
  "series-1": false,
  "series-2": false,
  "series-3": false,
  "series-4": false,
  "series-5": true, // Flare
};

export interface ProductionKpiSectionProps {
  productionKpis: readonly ProductionKpi[];
  className?: string;
}

export const ProductionKpiSection = ({
  productionKpis,
  className,
}: ProductionKpiSectionProps) => (
  <div
    role="group"
    aria-label="Production KPIs"
    className={cn(
      "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5",
      className
    )}
  >
    {productionKpis.map((kpi) => (
      <KpiTrendCard
        key={kpi.code}
        code={kpi.code}
        fullLabel={kpi.label}
        unit={kpi.unit}
        values={kpi.values}
        tone={SERIES_TONE_TO_CHART_TONE[kpi.tone]}
        lowerIsBetter={LOWER_IS_BETTER_TONE[kpi.tone]}
      />
    ))}
  </div>
);
