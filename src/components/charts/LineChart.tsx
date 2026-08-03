"use client";

import { useId } from "react";
import {
  Area,
  AreaChart as RechartsAreaChart,
  Line,
  LineChart as RechartsLineChart,
  XAxis,
  YAxis,
} from "recharts";

import { ChartFrame, type ChartSeries } from "@/components/charts/ChartFrame";
import { ChartKey } from "@/components/charts/ChartKey";
import {
  seriesKey,
  SWATCH_BY_TONE,
  VAR_BY_TONE,
  type ChartTone,
} from "@/components/charts/tones";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { CHART_TOOLTIP_PANEL_CLASS } from "@/components/charts/tooltipStyle";
import { cn } from "@/lib/utils";

/**
 * A multi-series line chart — the prototype's `iLine` (app-source.txt 482–496).
 *
 * Recharts through shadcn's `ChartContainer`; `StackedBarChart` carries the
 * account of why the library replaced the hand-rolled SVG.
 *
 * ## Two prototype problems the library fixes
 *
 * - **The `preserveAspectRatio="none"` distortion.** The prototype draws into
 *   `0 0 100 100` and stretches it, so the same 5% slope renders at a different
 *   angle on a wide card than a narrow one. Recharts measures its container, so
 *   a slope means the same thing at every width.
 * - **The hover crosshair is now reachable.** The prototype's tooltip (490–493)
 *   is `mouseenter`-only. Recharts' cursor follows pointer *and* keyboard
 *   interaction, and `ChartFrame`'s table still carries every point regardless.
 *
 * `connectNulls` is deliberately off: a gap in a series is a gap, and joining
 * across it would invent a reading that was never taken.
 */

export interface LineSeries {
  name: string;
  tone: ChartTone;
  /** One value per x label, in the same order as `xLabels`. */
  points: readonly number[];
}

/**
 * The hover panel, matching `iLine`'s exactly (app-source.txt 494).
 *
 * `ChartTooltipContent` was close but not the same, and the difference was
 * legible on screen: it lays each row out as swatch · name · **right-aligned
 * value in its own column**, which on a five-series panel pushed "51" hard
 * against "Average (MM)" with no space between them. The prototype writes one
 * run of text — `name + ': ' + value` — so the colon does the separating and
 * nothing can collide.
 *
 * Also drops the dashed indicator. `iLine`'s marker is a plain 8×8 rounded
 * square in the series colour; the dashed variant belongs to the bar chart's
 * panel, where it distinguishes a stack segment from a total.
 *
 * A module-scope component taking `series` as a prop rather than a closure
 * defined in the render: a new component *type* each render would remount the
 * panel on every pointer move.
 */
const LineTooltip = ({
  series,
  unit,
  active,
  payload,
  label,
}: {
  series: readonly LineSeries[];
  unit?: string;
  active?: boolean;
  payload?: readonly { dataKey?: string | number; value?: unknown }[];
  label?: unknown;
}) => {
  if (!active || !payload?.length) return null;

  return (
    <div className={CHART_TOOLTIP_PANEL_CLASS}>
      <p className="font-bold">{String(label)}</p>
      {payload.map((item) => {
        /*
          `dataKey` is `seriesKey(i)`, so the index recovers the series — the
          readable name and the tone both live there. Read positionally rather
          than from `item.name`, which Recharts fills from the config and would
          make this depend on two sources agreeing.
        */
        const index = Number(String(item.dataKey ?? "").replace(/^s/, ""));
        const entry = series[index];
        if (!entry || typeof item.value !== "number") return null;

        return (
          <p key={entry.name} className="mt-0.5 flex items-center gap-1.5">
            <span
              className={cn(
                "size-2 shrink-0 rounded-xs",
                SWATCH_BY_TONE[entry.tone]
              )}
            />
            {entry.name}: {item.value}
            {unit ? ` ${unit}` : ""}
          </p>
        );
      })}
    </div>
  );
};

interface LineChartProps {
  label: string;
  /** The x axis, one entry per point. */
  xLabels: readonly string[];
  series: readonly LineSeries[];
  /** Appended to each printed value in the accessible table. */
  unit?: string;
  /** Header for the accessible table's first column. */
  categoryHeader?: string;
  /**
   * Fill under the line with a fade to transparent — the prototype's treatment
   * for its two single-series monitoring trends (`adminDashboard` 420, 448).
   *
   * Single series only, and enforced below rather than documented: overlapping
   * translucent fills turn a five-series chart into mud, and the reason the
   * prototype gets away with it is that both of its filled charts plot one line.
   */
  filled?: boolean;
  className?: string;
}

export const LineChart = ({
  label,
  xLabels,
  series,
  unit,
  categoryHeader = "Point",
  filled = false,
  className,
}: LineChartProps) => {
  /**
   * `null`, not `0`, for a point the series does not have.
   *
   * Rows are built by walking `xLabels`, and nothing enforces that a series has
   * one point per label — `plantOperationsWireSchema` declares both as plain
   * arrays with no cross-field refinement. `?? 0` turned every missing reading
   * into a hard zero in the line *and* in the accessible table, so a Flare
   * series with five of seven days drew a plunge to zero across the weekend and
   * announced "0 t/d". A flare rate of zero is an operational event; it must not
   * be indistinguishable from a reading nobody took.
   *
   * `null` is what `connectNulls={false}` below is already waiting for — the
   * docblock promised "a gap in a series is a gap" and this is what makes it
   * true.
   */
  const valueAt = (entry: LineSeries, index: number): number | null =>
    entry.points[index] ?? null;

  /*
    One row per x position, one key per series — Recharts' shape. Keys are
    `seriesKey(i)`, not names: "ADP (MM)" is not a CSS identifier, and
    `var(--color-ADP (MM))` resolves to nothing. The readable name reaches the
    tooltip and legend through `config.label`.
  */
  const rows = xLabels.map((xLabel, index) => {
    const row: Record<string, string | number | null> = { x: xLabel };
    series.forEach((entry, seriesIndex) => {
      row[seriesKey(seriesIndex)] = valueAt(entry, index);
    });
    return row;
  });

  const config: ChartConfig = Object.fromEntries(
    series.map((entry, index) => [
      seriesKey(index),
      { label: entry.name, color: VAR_BY_TONE[entry.tone] },
    ])
  );

  const table: ChartSeries[] = series.map((entry) => ({
    name: entry.name,
    data: xLabels.map((xLabel, index) => {
      const point = valueAt(entry, index);
      return {
        label: xLabel,
        value: point,
        // `undefined`, so `cellFor` falls through to its own em dash rather
        // than printing the string "null ms".
        display:
          point === null
            ? undefined
            : unit
              ? `${point} ${unit}`
              : String(point),
      };
    }),
  }));

  // A fill only makes sense under a single line; see the `filled` docblock.
  const useArea = filled && series.length === 1;
  const gradientId = `${useId().replace(/:/g, "")}-fill`;

  const axes = (
    <>
      {/*
        No grid: `iLine` (486–495) is a bare polyline over the card background,
        with the x labels in a row beneath it and nothing else.

        `interval={0}` because Recharts hides a tick it thinks would collide,
        and the one it chose to drop was **Mon** — the series started at a label
        that was not printed, so a seven-day trend read as six days. The chart's
        16px side margins exist for the same fix: the first and last ticks are
        centred on the plot edges, so without them "Mon" and "Sun" render as
        "lon" and "Sur".
      */}
      <XAxis
        dataKey="x"
        tickLine={false}
        axisLine={false}
        tickMargin={10}
        interval={0}
        /*
          `C.mut2` at 9.5px — `iLine`'s axis row (496). Recharts' default tick is
          `--foreground`-dark and noticeably heavier than the prototype's, which
          made the day labels compete with the lines above them.
        */
        tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
      />
      {/*
        Hidden but present: without it every series is scaled independently and
        a flat line looks as dramatic as a steep one.
      */}
      <YAxis hide domain={["auto", "auto"]} />
      <ChartTooltip
        /*
          Pinned to the **top** of the plot, not floating at the pointer —
          `iLine` places its panel at `top:2` and only varies which side of the
          cursor line it sits on (494). A panel that tracks the pointer
          vertically covers the very lines it is describing.

          `y` only. Recharts short-circuits its edge clamping for any axis given
          an explicit position, so supplying `x` too would stop the panel
          flipping at the right-hand edge — which is the prototype's own
          `X(hi)>60 ? right : left` rule, for free.
        */
        position={{ y: 0 }}
        isAnimationActive={false}
        content={<LineTooltip series={series} unit={unit} />}
      />
    </>
  );

  return (
    <div className={cn("flex flex-col", className)}>
      {/*
        Before the chart body and outside the SVG, which is where `iLine` puts
        it (485) — `marginBottom:10`, hence `mb-2.5`. A single line needs no key:
        the card's own title already names it, and the prototype's two filled
        single-series trends have none either.
      */}
      {series.length > 1 ? (
        <ChartKey marker="line" entries={series} className="mb-2.5" />
      ) : null}

      <ChartFrame label={label} series={table} categoryHeader={categoryHeader}>
        <ChartContainer config={config} className="max-h-64 w-full">
          {useArea ? (
            <RechartsAreaChart
              data={rows}
              margin={{ top: 12, left: 16, right: 16 }}
            >
              <defs>
                {/*
                  `useId` rather than the chart's label: two filled charts on
                  one page with the same gradient id would have the second
                  silently adopt the first's colour, which is the kind of bug
                  that only shows up once a dashboard grows.
                */}
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={`var(--color-${seriesKey(0)})`}
                    stopOpacity={0.28}
                  />
                  <stop
                    offset="100%"
                    stopColor={`var(--color-${seriesKey(0)})`}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              {axes}
              <Area
                dataKey={seriesKey(0)}
                type="monotone"
                stroke={`var(--color-${seriesKey(0)})`}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                /*
                  No entrance animation. `iLine` draws a static polyline (486),
                  and an animated one means the chart briefly shows a shape that
                  is not the data — a screenshot taken during it caught the lines
                  stopping halfway across the week.
                */
                isAnimationActive={false}
                /*
                  A dot on every reading, growing on hover — `iLine` draws
                  `circle r=1.1`, or `2.4` for the hovered column (490). They
                  are what makes a seven-point week read as seven readings
                  rather than as a continuous curve.
                */
                dot={{ r: 2, strokeWidth: 0 }}
                activeDot={{ r: 4, strokeWidth: 0 }}
                connectNulls={false}
              />
            </RechartsAreaChart>
          ) : (
            <RechartsLineChart
              data={rows}
              margin={{ top: 12, left: 16, right: 16 }}
            >
              {axes}
              {series.map((entry, index) => (
                <Line
                  key={entry.name}
                  dataKey={seriesKey(index)}
                  type="monotone"
                  stroke={`var(--color-${seriesKey(index)})`}
                  isAnimationActive={false}
                  strokeWidth={2}
                  /* One dot per reading — see the note on the area above. */
                  dot={{ r: 2, strokeWidth: 0 }}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  connectNulls={false}
                />
              ))}
            </RechartsLineChart>
          )}
        </ChartContainer>
      </ChartFrame>
    </div>
  );
};
