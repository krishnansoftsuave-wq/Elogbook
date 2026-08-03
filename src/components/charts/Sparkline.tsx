"use client";

import { Bar, BarChart as RechartsBarChart } from "recharts";

import { ChartFrame } from "@/components/charts/ChartFrame";
import { VAR_BY_TONE, type ChartTone } from "@/components/charts/tones";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

/**
 * A compact trend strip — the prototype's `monSpark` (app-source.txt 381). Sits
 * beside a headline number on a monitoring tile, where the shape of the recent
 * trend matters and the individual values do not.
 *
 * Recharts through shadcn's `ChartContainer`; `StackedBarChart` carries the
 * account of why the library replaced the hand-rolled SVG.
 *
 * The prototype dims every bar but the last by suffixing the hex with an alpha
 * pair (`col+'66'`). That trick did not survive either port — a hex may not
 * reach a component (`.claude/rules/01`) and string-concatenated alpha is the
 * colour arithmetic the `--chart-*` tokens exist to replace — so the emphasis
 * is opacity on the same token. History recedes, the current reading stands out.
 *
 * It still renders through `ChartFrame`. A sparkline looks decorative, but it
 * is the only place the trend appears on a monitoring tile, so dropping the
 * accessible table would make the trend sighted-only — the precise gap
 * `SCREENS.md` records against the prototype.
 */

interface SparklineProps {
  /** Reads as a sentence — it becomes the `aria-label` and the table caption. */
  label: string;
  values: readonly number[];
  /** Labels for the accessible table, one per value (e.g. timestamps). */
  pointLabels?: readonly string[];
  tone?: ChartTone;
  /** Header for the accessible table's first column. */
  categoryHeader?: string;
  seriesName?: string;
  className?: string;
}

export const Sparkline = ({
  label,
  values,
  pointLabels,
  tone = "chart-1",
  categoryHeader = "Reading",
  seriesName = "Value",
  className,
}: SparklineProps) => {
  /**
   * Falls back to a 1-based position rather than an empty string: the table's
   * row headers have to distinguish the readings from each other, and every
   * caller that omits `pointLabels` is passing an ordered time series.
   */
  const labelAt = (index: number): string =>
    pointLabels?.[index] ?? `Reading ${index + 1}`;

  const lastIndex = values.length - 1;

  /**
   * The shortest a bar may draw, as a share of the tallest — the prototype's
   * `Math.max(3, …)` (app-source.txt 381), expressed proportionally because this
   * chart is measured rather than fixed at 32px.
   *
   * Without it a zero reads as "no data" instead of "the value is zero", and
   * Flaring Rate — real, and mostly zero — renders an almost-empty strip most
   * shifts. Only the *drawn* value is floored; `series` below still reports the
   * true number, so the accessible table never inherits the fudge.
   */
  const max = Math.max(...values, 0);
  const floor = max > 0 ? max * 0.06 : 1;

  const rows = values.map((value, index) => ({
    label: labelAt(index),
    value,
    plotted: Math.max(value, floor),
    // Per-bar opacity, so only the latest reading is at full strength.
    fillOpacity: index === lastIndex ? 1 : 0.4,
  }));

  const config: ChartConfig = {
    value: { label: seriesName, color: VAR_BY_TONE[tone] },
  };

  return (
    <ChartFrame
      label={label}
      categoryHeader={categoryHeader}
      className={cn("w-full", className)}
      series={[
        {
          name: seriesName,
          data: values.map((value, index) => ({
            label: labelAt(index),
            value,
          })),
        },
      ]}
    >
      <ChartContainer config={config} className="aspect-4/1 w-full">
        {/*
          No tooltip. A sparkline is a *shape* — it sits beside the headline
          figure to say "and this is the direction", and the prototype's version
          (381) has no interaction at all. Eight hoverable bars in a 32px strip
          would be fiddly to hit and would report numbers nobody came here for;
          `ChartFrame`'s table has them for anyone who does.
        */}
        <RechartsBarChart data={rows} margin={{ top: 2 }}>
          {/*
            `plotted`, not `value` — the floored height, so a zero still draws a
            sliver. The table above reports `value`, which is the real one.
          */}
          <Bar dataKey="plotted" fill="var(--color-value)" radius={1} />
        </RechartsBarChart>
      </ChartContainer>
    </ChartFrame>
  );
};
