"use client";

import { useState } from "react";
import { Cell, Pie, PieChart as RechartsPieChart } from "recharts";

import { ChartFrame, type ChartDatum } from "@/components/charts/ChartFrame";
import {
  seriesKey,
  SWATCH_BY_TONE,
  VAR_BY_TONE,
  type ChartTone,
} from "@/components/charts/tones";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

/**
 * A donut chart — the prototype's `iPie` (app-source.txt 498–515).
 *
 * Recharts through shadcn's `ChartContainer`; `StackedBarChart` carries the
 * account of why the library replaced the hand-rolled SVG.
 *
 * ## The highlight, and why it replaces a tooltip
 *
 * Hovering a slice — **or its legend row** — does three things: pushes that
 * sector out, recedes the other legend rows, and **swaps the centre readout to
 * that slice**, so `70 · items by due date` becomes `28 · Due ≤ 30 days`.
 *
 * The chart grows and the *legend* dims, deliberately asymmetric. Fading slices
 * greys out the RAG colour coding that is the whole point of the ring; fading
 * legend rows costs nothing, because the row that matters is the one still at
 * full strength. Both directions were tried — dimming the ring read as "those
 * are disabled" rather than "this is selected".
 *
 * It replaces the floating tooltip Recharts would give for free, because a donut
 * already has a place to put a number. A tooltip would cover the chart to say
 * something the middle of the chart can say without moving.
 *
 * ## The legend rows are buttons
 *
 * The prototype highlights on `mouseenter` only, so a keyboard user never sees
 * it. Here each row is a real `<button>`, so the same emphasis follows focus —
 * and `ChartFrame`'s table still carries every value, so nothing depends on the
 * interaction at all.
 *
 * ## The legend is still ours
 *
 * Recharts has one, and it is not used. The prototype's version is a *table* —
 * label, count, percentage in aligned columns — which is better than a row of
 * swatches for a card whose job is reporting five numbers. Adopting a library
 * is not the same as adopting all of it.
 */

export interface PieSlice extends ChartDatum {
  /**
   * Narrowed from `ChartDatum`'s `number | null`. A missing reading is a
   * meaningful state on a trend line — it is why `ChartDatum` allows null — but
   * a wedge has to have a size, and "unknown" cannot be drawn as a share of a
   * total. Callers filter or zero the gap before it gets here.
   */
  value: number;
  tone: ChartTone;
}

interface PieChartProps {
  /** Reads as a sentence — it becomes the `aria-label` and the table caption. */
  label: string;
  data: readonly PieSlice[];
  /** Large number in the middle. Defaults to the sum of the values. */
  centerValue?: string;
  /** Caption under it, e.g. "open actions". */
  centerLabel?: string;
  /** Header for the accessible table's first column. */
  categoryHeader?: string;
  /** Name of the measured series in that table. */
  seriesName?: string;
  className?: string;
}

/**
 * The ring's two outer radii.
 *
 * `REST` is held back from the full radius so the active slice has somewhere to
 * grow into; the gap between the two *is* the emphasis. Percentages rather than
 * pixels so the ring scales with the card.
 */
const OUTER_RADIUS_REST = "86%";
const OUTER_RADIUS_ACTIVE = "100%";

const percent = (value: number, total: number): string =>
  total <= 0 ? "0%" : `${Math.round((value / total) * 100)}%`;

export const PieChart = ({
  label,
  data,
  centerValue,
  centerLabel = "total",
  categoryHeader = "Category",
  seriesName = "Value",
  className,
}: PieChartProps) => {
  const [active, setActive] = useState<number | null>(null);
  const total = data.reduce((sum, slice) => sum + slice.value, 0);

  /*
    Keyed by `seriesKey(index)`, not by the slice's label — the same rule
    `StackedBarChart` and `LineChart` already follow, and for the same reason.
    `ChartStyle` interpolates every config key straight into a `<style>` node as
    a CSS custom-property name, so a label like "Due ≤ 7 days" emitted
    `--color-Due ≤ 7 days: var(--chart-3);` — invalid CSS, silently dropped by
    the parser. It happened not to matter here because the fills come from
    `VAR_BY_TONE` directly rather than through `var(--color-…)`, but a config
    that quietly produces broken CSS is a trap for the next reader, and label
    text is API data.

    The readable name still reaches the tooltip through `config[key].label`.
  */
  const config: ChartConfig = Object.fromEntries(
    data.map((slice, index) => [
      seriesKey(index),
      { label: slice.label, color: VAR_BY_TONE[slice.tone] },
    ])
  );

  /*
    `isActive` rides on the datum rather than being read from state inside the
    radius callback. Recharts calls that callback with the *data point*, not an
    index, so the flag is the only thing it can see — and putting it here means
    one source of truth drives both the slice and its legend row.
  */
  const rows = data.map((slice, index) => ({
    label: slice.label,
    value: slice.value,
    fill: VAR_BY_TONE[slice.tone],
    isActive: active === index,
  }));

  const highlighted = active === null ? null : data[active];

  return (
    <div
      className={cn(
        // Legend beside the donut on a wide card, beneath it on a narrow one —
        // a fixed row would overflow at 375px.
        "flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6",
        className
      )}
    >
      <div className="relative w-full max-w-44 shrink-0">
        <ChartFrame
          label={label}
          categoryHeader={categoryHeader}
          series={[
            {
              name: seriesName,
              data: data.map((slice) => ({
                label: slice.label,
                value: slice.value,
                display:
                  slice.display ??
                  `${slice.value} (${percent(slice.value, total)})`,
              })),
            },
          ]}
        >
          <ChartContainer config={config} className="aspect-square w-full">
            <RechartsPieChart>
              <Pie
                data={total > 0 ? rows : [{ label: "", value: 1, fill: "" }]}
                dataKey="value"
                nameKey="label"
                innerRadius="62%"
                /*
                  **Grow the hovered slice; do not fade the others.**

                  An earlier version dimmed every other slice to 28%, which reads
                  as "those are disabled" rather than "this one is selected" — and
                  on a five-slice RAG ring it greys out the colour coding that is
                  the point of the chart. Pushing the active sector out instead
                  keeps every colour legible and makes the emphasis additive.

                  A **function of the data point**, which is the v3-supported
                  route: `activeIndex` was removed from `Pie` in Recharts 3, and
                  `activeShape` is driven by the tooltip's own active state
                  rather than by ours. Because this reads `isActive` off the
                  datum, the same state serves a pointer on the slice *and* a
                  pointer or keyboard focus on the legend row — which is why
                  hovering the text grows the ring.
                */
                outerRadius={(slice) =>
                  slice.isActive ? OUTER_RADIUS_ACTIVE : OUTER_RADIUS_REST
                }
                // -90° so the first slice starts at twelve o'clock, not three.
                startAngle={90}
                endAngle={-270}
                strokeWidth={0}
                isAnimationActive={false}
                /*
                  `rootTabIndex={-1}`: `Pie` defaults it to 0
                  (`recharts/es6/polar/Pie.js:561`) and puts it on the `<g>`,
                  which sits inside `ChartFrame`'s `role="img"` — a focus stop
                  with no accessible name, announcing nothing. `ui/chart.tsx`
                  also applies `[&_.recharts-layer]:outline-hidden`, so it had
                  no visible ring either: the focus indicator simply vanished
                  from the page, failing WCAG 2.4.7. Nothing is lost by removing
                  it — the ring offers no keyboard interaction, the legend rows
                  below are real focusable buttons, and the accessible table
                  carries every number.
                */
                rootTabIndex={-1}
                /*
                  Guarded on there being data. When `total` is 0 the ring is a
                  single grey placeholder slice, and hovering it used to set
                  `active = 0` — which the centre readout and legend resolve
                  against the *real* `data`, so the explicit no-data ring
                  reported itself as the first bucket.
                */
                onMouseEnter={(_, index) => {
                  if (total > 0) setActive(index);
                }}
                onMouseLeave={() => setActive(null)}
              >
                {(total > 0 ? rows : [{ label: "empty", fill: "" }]).map(
                  (row, index) => (
                    <Cell
                      key={row.label || index}
                      // An empty ring rather than nothing when the total is 0:
                      // "no data" and "failed to render" must not look alike.
                      fill={row.fill || "var(--border)"}
                    />
                  )
                )}
              </Pie>
            </RechartsPieChart>
          </ChartContainer>
        </ChartFrame>

        {/*
          The centre readout sits outside the chart so it inherits the page's
          font stack and scales with the user's text size. `aria-hidden` because
          the same numbers are already in ChartFrame's table — announcing them
          again on every hover would make the chart unusable with a screen
          reader running.
        */}
        <div
          data-slot="chart-center"
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          aria-hidden
        >
          <span className="text-2xl leading-none font-bold text-foreground">
            {highlighted ? highlighted.value : (centerValue ?? total)}
          </span>
          <span className="mt-1 max-w-24 text-center text-2xs leading-tight text-muted-foreground">
            {highlighted ? highlighted.label : centerLabel}
          </span>
        </div>
      </div>

      <ul className="flex w-full flex-col gap-0.5">
        {data.map((slice, index) => (
          <li key={slice.label}>
            <button
              type="button"
              /*
                A button, not a list row: this is the keyboard path to the same
                emphasis the pointer gets. It selects nothing and navigates
                nowhere, so there is no `aria-pressed` — the highlight is
                transient feedback, and the values it reveals are already in the
                table.
              */
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              /*
                **Emphasis is additive, not subtractive.** The other rows used
                to drop to `opacity-40`, which composites `--foreground` to
                2.32:1 on the card and `--muted-foreground` to 1.73:1 — well
                under WCAG 1.4.3's 4.5:1, on text that still carries the
                category, the count and the share. And it was not opt-in:
                `onFocus` above means simply tabbing to the first row dimmed
                every other one, so a keyboard user could not avoid it.

                The active row now gets a tinted background instead, matching
                how the pie itself emphasises (grow the wedge, do not fade the
                rest) — see `outerRadius`.
              */
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-1.5 py-1 text-start transition-colors",
                "hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                active === index && "bg-accent/60"
              )}
            >
              <span
                className={cn(
                  "size-2.5 shrink-0 rounded-sm",
                  SWATCH_BY_TONE[slice.tone]
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "flex-1 truncate text-sm text-foreground",
                  active === index && "font-semibold"
                )}
              >
                {slice.label}
              </span>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {slice.value}
              </span>
              <span className="w-10 text-end text-xs text-muted-foreground tabular-nums">
                {percent(slice.value, total)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
