import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { Sparkline } from "@/components/charts/Sparkline";
import { SWATCH_BY_TONE, type ChartTone } from "@/components/charts/tones";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * A production-KPI trend card — the prototype's `sparkCard` (app-source.txt
 * 1876–1887), the widget the Trends & KPIs strip renders one of per metric
 * (`prodSection`, app-source.txt 1918).
 *
 * Two translations from the prototype, each required rather than preferred:
 *
 * - **Material Icons → `lucide-react`.** `trending_flat` /
 *   `arrow_upward` / `arrow_downward` become `Minus` / `ArrowUp` /
 *   `ArrowDown`, decorative (`aria-hidden`) beside the text that already
 *   carries the direction — "+1 MM vs prev" says "up" whether or not the icon
 *   renders, which the prototype's colour-and-icon-only version does not.
 * - **Delta colour comes from `--success` / `--destructive`**, the same pair
 *   `ShiftKpis` uses for "Overdue" and "Verified", rather than the
 *   prototype's inline `'#2E7D32'` / `'#C0392B'`.
 *
 * `values` is oldest → newest, the convention every trends field uses (see
 * `features/trends/schemas.ts`). Latest, previous, average, minimum and
 * maximum are all derived here rather than carried on the wire, matching
 * `sparkCard`'s own arithmetic (`latest=vals[vals.length-1]`, …) — a response
 * that shipped both the series and its own summary could disagree with
 * itself.
 *
 * **`lowerIsBetter` is a deliberate deviation from the prototype, not a
 * transcription gap.** `sparkCard` colours every increase green and every
 * decrease red, unconditionally (`up?'#2E7D32':'#C0392B'`, app-source.txt
 * 1884) — faithfully ported here as the `false` default. For Flare (flaring
 * rate), that is backwards: a *reduction* in flaring is the good outcome in an
 * LNG control room, and rendering it destructive-red tells the reader the
 * opposite of the truth. `ProductionKpiSection.tsx` passes `true` for Flare
 * and leaves every other metric at the prototype's default — see its own
 * comment for the metric-by-metric call. This mirrors how `route.ts`
 * documents the period selector's data-slicing as an improvement over the
 * prototype rather than a silent fix: named here so the next person diffing
 * against `app-source.txt` reads it as an intentional change, not a
 * transcription error.
 */

export interface KpiTrendCardProps {
  /** Short code, e.g. "ADP" — the card's own heading. */
  code: string;
  /** Full metric name, e.g. "Agreed Daily Prod." */
  fullLabel: string;
  unit: string;
  /** Oldest → newest. */
  values: readonly number[];
  tone: ChartTone;
  /**
   * Flips the delta's tone: a decrease renders `--success` and an increase
   * renders `--destructive`. Default `false` matches the prototype's
   * unconditional "up is green" — see the file docblock for why Flare passes
   * `true`.
   */
  lowerIsBetter?: boolean;
  className?: string;
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

export const KpiTrendCard = ({
  code,
  fullLabel,
  unit,
  values,
  tone,
  lowerIsBetter = false,
  className,
}: KpiTrendCardProps) => {
  const hasSeries = values.length > 0;
  const latest = values[values.length - 1];
  const prev = values[values.length - 2];
  const delta =
    latest !== undefined && prev !== undefined ? round1(latest - prev) : null;

  const avg = hasSeries
    ? round1(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;
  const min = hasSeries ? Math.min(...values) : null;
  const max = hasSeries ? Math.max(...values) : null;

  const DeltaIcon =
    delta === null || delta === 0 ? Minus : delta > 0 ? ArrowUp : ArrowDown;
  const isImprovement =
    delta !== null && delta !== 0 && delta > 0 !== lowerIsBetter;
  const deltaTone =
    delta === null || delta === 0
      ? "text-muted-foreground"
      : isImprovement
        ? "text-success"
        : "text-destructive";
  const deltaText =
    delta === null
      ? null
      : delta === 0
        ? "no change vs prev"
        : `${delta > 0 ? "+" : ""}${delta} ${unit} vs prev`;

  return (
    <Card className={className}>
      <CardContent className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-foreground">{code}</span>
          <span
            className={cn("size-2.5 shrink-0 rounded-sm", SWATCH_BY_TONE[tone])}
            aria-hidden
          />
        </div>
        <p className="-mt-1.5 text-2xs text-muted-foreground">{fullLabel}</p>

        <div className="flex items-end gap-1.5">
          <span className="text-2xl leading-none font-bold text-foreground tabular-nums">
            {latest ?? "—"}
          </span>
          <span className="mb-0.5 text-xs text-muted-foreground">{unit}</span>
        </div>

        {deltaText ? (
          <div
            className={cn(
              "flex items-center gap-1.5 text-xs font-semibold",
              deltaTone
            )}
          >
            <DeltaIcon className="size-3.5 shrink-0" aria-hidden />
            {deltaText}
          </div>
        ) : null}

        <Sparkline
          label={`${fullLabel} — daily values`}
          values={values}
          tone={tone}
        />

        {hasSeries ? (
          <div className="flex justify-between border-t border-border pt-2 text-2xs text-muted-foreground">
            <span>
              avg <b className="font-semibold text-foreground">{avg}</b>
            </span>
            <span>
              min <b className="font-semibold text-foreground">{min}</b>
            </span>
            <span>
              max <b className="font-semibold text-foreground">{max}</b>
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
