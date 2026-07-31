import { ChartFrame, type ChartDatum } from "@/components/charts/ChartFrame";
import { circumference, percent, slices } from "@/components/charts/scale";
import {
  STROKE_BY_TONE,
  SWATCH_BY_TONE,
  type ChartTone,
} from "@/components/charts/tones";
import { cn } from "@/lib/utils";

/**
 * A donut chart — the prototype's `iPie` (app-source.txt 498–515), translated.
 *
 * Four things changed on the way across, each of them required rather than
 * preferred:
 *
 * | Prototype | Here | Why |
 * | --- | --- | --- |
 * | `d.color` hex per slice | `tone` → a `--chart-*` token | No hex may reach a component (`.claude/rules/01`); a hex also cannot respond to dark mode |
 * | fixed `width:140 height:140` | `viewBox` + `h-auto w-full` | Fluid at 375 / 768 / 1440 |
 * | hover state in `this.state.chartHover` | none | Hover-only information is inaccessible; the legend already carries every value |
 * | no accessible equivalent | `ChartFrame`'s hidden table | WCAG 2.1 AA — the gap `SCREENS.md` documents |
 *
 * The slice geometry is `stroke-dasharray` on concentric `<circle>`s rather than
 * arc paths, which is the prototype's technique and the right one: it needs no
 * trigonometry and it degenerates correctly when one slice is the whole pie,
 * which a single arc command cannot express.
 */

export interface PieSlice extends ChartDatum {
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
  /**
   * Header for the accessible table's first column. Defaults to "Category".
   *
   * Exposed because hardcoding it made the fallback lie: a chart captioned
   * "Shift entries by area" announced its row-header column as "Status" and its
   * data column as "Actions", which undoes the entire point of building an
   * accessible equivalent.
   */
  categoryHeader?: string;
  /** Name of the measured series in that table. Defaults to "Value". */
  seriesName?: string;
  className?: string;
}

const SIZE = 140;
const RADIUS = 52;
const STROKE = 16;

export const PieChart = ({
  label,
  data,
  centerValue,
  centerLabel = "total",
  categoryHeader = "Category",
  seriesName = "Value",
  className,
}: PieChartProps) => {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);
  const geometry = slices(
    data.map((slice) => slice.value),
    RADIUS
  );
  const circle = circumference(RADIUS);

  return (
    <div
      className={cn(
        // Legend beside the donut on a wide card, beneath it on a narrow one —
        // the prototype's fixed row would overflow at 375px.
        "flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6",
        className
      )}
    >
      <div className="relative w-full max-w-[8.75rem] shrink-0">
        <ChartFrame
          label={label}
          width={SIZE}
          height={SIZE}
          categoryHeader={categoryHeader}
          series={[
            {
              name: seriesName,
              data: data.map((slice, index) => ({
                label: slice.label,
                value: slice.value,
                display:
                  slice.display ??
                  `${slice.value} (${percent(geometry[index]?.fraction ?? 0)})`,
              })),
            },
          ]}
        >
          {/* -90° so the first slice starts at twelve o'clock, not three. */}
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {data.map((slice, index) => {
              const arc = geometry[index];
              if (!arc || arc.dash <= 0) return null;

              return (
                <circle
                  key={slice.label}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  strokeWidth={STROKE}
                  strokeDasharray={`${arc.dash} ${arc.gap}`}
                  strokeDashoffset={arc.offset}
                  className={STROKE_BY_TONE[slice.tone]}
                />
              );
            })}
            {total <= 0 && (
              // An empty ring rather than nothing: "no data" and "chart failed
              // to render" must not look identical.
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                strokeWidth={STROKE}
                strokeDasharray={circle}
                className="stroke-border"
              />
            )}
          </g>
        </ChartFrame>

        {/*
          The centre readout sits outside the SVG so it inherits the page's font
          stack and scales with the user's text size. `aria-hidden` because the
          same numbers are already in ChartFrame's table.
        */}
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          aria-hidden
        >
          <span className="text-2xl leading-none font-bold text-foreground">
            {centerValue ?? total}
          </span>
          <span className="mt-1 max-w-[6rem] text-center text-2xs leading-tight text-muted-foreground">
            {centerLabel}
          </span>
        </div>
      </div>

      <ul className="flex w-full flex-col gap-2.5">
        {data.map((slice, index) => (
          <li key={slice.label} className="flex items-center gap-2.5">
            <span
              className={cn(
                "size-2.5 shrink-0 rounded-sm",
                SWATCH_BY_TONE[slice.tone]
              )}
              aria-hidden
            />
            <span className="flex-1 text-sm text-foreground">
              {slice.label}
            </span>
            <span className="text-sm font-semibold text-foreground tabular-nums">
              {slice.value}
            </span>
            <span className="w-10 text-end text-xs text-muted-foreground tabular-nums">
              {percent(geometry[index]?.fraction ?? 0)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
