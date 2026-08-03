"use client";

import { Cell, Pie, PieChart as RechartsPieChart } from "recharts";

import { ChartFrame } from "@/components/charts/ChartFrame";
import { VAR_BY_TONE, type ChartTone } from "@/components/charts/tones";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

/**
 * A single-value ring — the prototype's `donut` (app-source.txt 389–395).
 *
 * ## Why this is not `PieChart`
 *
 * It was, briefly, and that was wrong. `PieChart` is for a *series*: it earns
 * its legend, its per-slice percentages and its hover highlight because a
 * reader needs to compare categories. A gauge has one number. Expressing
 * "94.2% accurate" as two slices produced an "Inaccurate 5.8 / 6%" row that
 * nobody asked to see and a hover interaction over a chart with nothing to
 * discover — the prototype draws one arc and puts the figure in the middle
 * (435), which is the whole idea.
 *
 * So: no legend, no tooltip, no hover state. The remainder is drawn in the
 * muted track colour rather than as a second data slice, because it is not
 * data — it is the part of the ring the value has not reached.
 *
 * `ChartFrame` still wraps it. One number is still a number a screen-reader
 * user needs, and the centre readout is `aria-hidden` for the same reason it is
 * on `PieChart`: the table already carries it.
 */

interface GaugeProps {
  /** Reads as a sentence — it becomes the `aria-label` and the table caption. */
  label: string;
  /** 0–100. Values outside are clamped rather than drawn past the ring. */
  percent: number;
  /** Caption under the figure, e.g. "model accuracy". */
  caption?: string;
  /**
   * Ring colour. Defaults to the brand tone; callers with a quality threshold
   * pass a semantic one — the prototype greens above 93, ambers above 88 and
   * reds below (`accCol`, 402).
   */
  tone?: ChartTone;
  /** Row header for the accessible table. */
  categoryHeader?: string;
  className?: string;
}

export const Gauge = ({
  label,
  percent,
  caption,
  tone = "chart-1",
  categoryHeader = "Measure",
  className,
}: GaugeProps) => {
  const value = Math.max(0, Math.min(100, percent));
  const rounded = Math.round(value * 10) / 10;

  const config: ChartConfig = {
    value: { label, color: VAR_BY_TONE[tone] },
  };

  return (
    <div className={cn("relative mx-auto w-full max-w-52", className)}>
      <ChartFrame
        label={label}
        categoryHeader={categoryHeader}
        series={[
          {
            name: "Value",
            data: [{ label, value: rounded, display: `${rounded}%` }],
          },
        ]}
      >
        <ChartContainer config={config} className="aspect-square w-full">
          <RechartsPieChart>
            <Pie
              data={[
                { key: "value", value },
                { key: "rest", value: 100 - value },
              ]}
              dataKey="value"
              innerRadius="70%"
              outerRadius="100%"
              // From twelve o'clock, clockwise — the prototype's `-90°` rotate.
              startAngle={90}
              endAngle={-270}
              strokeWidth={0}
              isAnimationActive={false}
              /*
                `Pie` defaults `rootTabIndex` to 0 and puts it on its `<g>`
                (`recharts/es6/polar/Pie.js:561`), which lands inside
                `ChartFrame`'s `role="img"` — a tab stop with no accessible name
                and, thanks to `[&_.recharts-layer]:outline-hidden` in
                `ui/chart.tsx`, no visible ring either. That is a WCAG 2.4.7
                failure for a ring that offers no keyboard interaction at all.
              */
              rootTabIndex={-1}
              /*
                No `onMouseEnter`, and no `<Tooltip>` anywhere in this tree.
                There is one value and it is printed in the middle at 24px; a
                tooltip would cover the number to repeat it.
              */
            >
              <Cell fill={VAR_BY_TONE[tone]} />
              {/* The unreached remainder — a track, not a datum. */}
              <Cell fill="var(--muted)" />
            </Pie>
          </RechartsPieChart>
        </ChartContainer>
      </ChartFrame>

      <div
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
        aria-hidden
      >
        <span className="text-2xl leading-none font-bold text-foreground">
          {rounded}%
        </span>
        {caption ? (
          <span className="mt-1 max-w-28 text-center text-2xs leading-tight text-muted-foreground">
            {caption}
          </span>
        ) : null}
      </div>
    </div>
  );
};
