"use client";

import {
  bands,
  barTop,
  linearHeight,
  niceMax,
  plotArea,
} from "@/components/charts/scale";
import { FILL_BY_TONE, type ChartTone } from "@/components/charts/tones";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { cn } from "@/lib/utils";

/**
 * A tiny bar sparkline — the prototype's `monSpark` (app-source.txt 381),
 * used inline wherever a value needs its recent shape at a glance rather than
 * a full chart. `KpiTrendCard` embeds one per KPI; the admin monitor's
 * error-rate history (app-source.txt 432) is the prototype's other caller,
 * for whenever that screen is ported.
 *
 * One deliberate difference from the prototype's geometry:
 * `Math.max(MIN_BAR_HEIGHT, ...)` gives every bar, including a zero value, a
 * visible sliver rather than nothing. A sparkline that goes fully blank on a
 * zero reads as "no data" rather than "value is zero" — and Flaring Rate's
 * real series is mostly zero (app-source.txt 1914), so without the floor its
 * sparkline would be an almost-empty strip most shifts.
 *
 * The most recent point (rightmost — `values` is oldest → newest, the
 * convention every trends field uses) draws at full opacity; the rest at 40%,
 * the same emphasis the prototype gives it with a lighter fill on every bar
 * but the last (`col+'66'`, app-source.txt 381).
 *
 * `values` carries no per-point date — the wire shape it is built for
 * (`ProductionKpi.values`) does not either — so the accessible table's rows
 * are positional: "`{categoryHeader}` 1" is the oldest point, not a calendar
 * date. A caller with real dates should label them itself; this primitive has
 * none to offer.
 */

export interface SparklineProps {
  /** Reads as a sentence — becomes the `aria-label` and the table caption. */
  label: string;
  /** Oldest → newest. */
  values: readonly number[];
  tone: ChartTone;
  /** Header for the accessible table's first column, and its row prefix. */
  categoryHeader?: string;
  className?: string;
}

const WIDTH = 200;
const HEIGHT = 32;
const PADDING = { top: 2, right: 0, bottom: 0, left: 0 };
/** The shortest a bar may draw — see the docblock above for why. */
const MIN_BAR_HEIGHT = 3;

export const Sparkline = ({
  label,
  values,
  tone,
  categoryHeader = "Day",
  className,
}: SparklineProps) => {
  const plot = plotArea(WIDTH, HEIGHT, PADDING);
  const max = niceMax(values);
  const slots = bands(plot, values.length, 0.25);

  return (
    <ChartFrame
      label={label}
      width={WIDTH}
      height={HEIGHT}
      categoryHeader={categoryHeader}
      series={[
        {
          name: "Value",
          data: values.map((value, index) => ({
            label: `${categoryHeader} ${index + 1}`,
            value,
          })),
        },
      ]}
      className={className}
    >
      {values.map((value, index) => {
        const slot = slots[index];
        if (!slot) return null;

        const height = Math.max(
          MIN_BAR_HEIGHT,
          linearHeight(value, max, plot.height)
        );
        const isLatest = index === values.length - 1;

        return (
          <rect
            key={index}
            x={slot.x}
            y={barTop(plot, height)}
            width={slot.width}
            height={height}
            rx={1}
            className={cn(FILL_BY_TONE[tone], !isLatest && "opacity-40")}
          />
        );
      })}
    </ChartFrame>
  );
};
