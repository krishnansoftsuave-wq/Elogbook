"use client";

import { useState } from "react";
import {
  Bar,
  BarChart as RechartsBarChart,
  LabelList,
  Rectangle,
  XAxis,
  YAxis,
} from "recharts";
import type { RectangleProps } from "recharts";

import { ChartFrame, type ChartSeries } from "@/components/charts/ChartFrame";
import { ChartKey } from "@/components/charts/ChartKey";
import {
  seriesKey,
  VAR_BY_TONE,
  type ChartTone,
} from "@/components/charts/tones";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  CHART_TOOLTIP_CLASS,
  CHART_TOOLTIP_INDICATOR,
} from "@/components/charts/tooltipStyle";
import { cn } from "@/lib/utils";

/**
 * A stacked column chart — the prototype's `iStackBar` (app-source.txt
 * 529–545) and, for the single-bucket case, `iBar` (`oosArea`'s call, line
 * 1946: `{height:120, barW:52, unit:'items'}`).
 *
 * ## Recharts, via shadcn's `ChartContainer`
 *
 * This was hand-rolled SVG until the owner chose a library. The choice was
 * Recharts on two grounds: it is what **shadcn/ui's own chart component uses**,
 * and this repo is already a shadcn project (`components.json`, `shadcn` in
 * devDependencies), so it is the design system's chart layer rather than a
 * foreign one; and it renders **SVG**, which keeps `.claude/rules/03`'s WCAG
 * 2.1 AA reachable in a way Chart.js's canvas would not.
 *
 * It contradicts `SCREENS.md`'s *"port these as typed primitives rather than
 * adding a dependency"*. That line predates the knowledge that the design
 * system's own charts are Recharts; the divergence is the owner's, recorded
 * rather than silent.
 *
 * ## What did not change
 *
 * - **`ChartFrame` still wraps it.** Recharts gives no table fallback, so the
 *   accessibility contract is unchanged — same `role="img"`, same hidden table.
 * - **No colour reaches this file.** Tones resolve to `var(--chart-*)` through
 *   `VAR_BY_TONE`, so light/dark still lives in `globals.css`.
 * - **`onSelect` stays a real `<button>` row.** Recharts' `onClick` on a bar is
 *   mouse-only; the prototype's drill-down (`o.onBar`, 536) has the same flaw.
 *
 * ## What the library bought
 *
 * Hover tooltips and a hover cursor, for free — the one thing the hand-rolled
 * version genuinely lacked.
 */

/**
 * Reads `__total` off whatever Recharts hands the tooltip, without an `as`
 * cast — `eslint.config.mjs` bans those, and rightly: the payload is the
 * library's type, so narrowing it by assertion would be claiming knowledge of
 * a shape this file does not own. A guard returns `null` when the field is
 * missing, and the caller prints the bare label instead.
 */
const totalOf = (payload: unknown): number | null => {
  if (typeof payload !== "object" || payload === null) return null;
  if (!("__total" in payload)) return null;

  const { __total: total } = payload;
  return typeof total === "number" ? total : null;
};

/** The rendered geometry Recharts passes a bar's mouse handlers. */
interface BarRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Same reasoning as `totalOf` — a guard, not a cast. */
const rectOf = (data: unknown): BarRect | null => {
  if (typeof data !== "object" || data === null) return null;
  // Written out rather than looped: `in` narrows the type, and a loop over key
  // names does not, so TypeScript would refuse the destructure below.
  if (!("x" in data) || !("y" in data)) return null;
  if (!("width" in data) || !("height" in data)) return null;

  const { x, y, width, height } = data;
  return typeof x === "number" &&
    typeof y === "number" &&
    typeof width === "number" &&
    typeof height === "number"
    ? { x, y, width, height }
    : null;
};

/**
 * Which **column** a rendered rectangle belongs to — for the mouse handlers,
 * which is the one path Recharts hands the honest answer to.
 *
 * `Bar` drops every zero-dimension rectangle before it renders
 * (`cartesian/Bar.js`: *"Filter out 0-dimension rectangles early"*, then
 * `.filter(Boolean)`), so the positional `index` a handler receives is the place
 * **within that series' drawn rectangles**, not the category. On the safety chart
 * "No date" is 0 for four of seven categories, so that series draws three
 * rectangles numbered 0, 1, 2 which actually belong to columns 3, 4 and 6.
 *
 * Recharts keeps the true index on the same object — `originalDataIndex`, put
 * there for exactly this reason (*"sparse filtered arrays remain index-stable"*)
 * — and the rectangle handed to `onMouseEnter` carries it alongside the geometry
 * `rectOf` reads. One object, both answers.
 *
 * ⚠️ **A `LabelList` entry does not carry it**, which is why the total label
 * takes a different route entirely — see `totalForLabel`.
 *
 * A guard rather than a cast, on the same grounds as `rectOf`.
 */
const categoryIndexOf = (entry: unknown): number | null => {
  if (typeof entry !== "object" || entry === null) return null;
  if (!("originalDataIndex" in entry)) return null;

  const { originalDataIndex: index } = entry;
  return typeof index === "number" ? index : null;
};

/**
 * The synthetic row fields: a column's total, and which bucket prints it.
 *
 * They travel on the data row rather than as a series, so no `Bar` draws them —
 * `rows` writes them, `totalOf` reads the first for the tooltip heading, and
 * `totalForLabel` reads both. Named constants because two of those three are
 * `in`-checks on an untyped payload, where a typo fails silently by returning
 * "no total" rather than by erroring.
 */
const TOTAL_KEY = "__total";
const LABEL_BUCKET_KEY = "__labelBucket";
/** A category's own colour, overriding its bucket's. Empty string = no override. */
const TONE_KEY = "__tone";

/**
 * The column total this bar should print, or `undefined` when this bar is not
 * its column's label-bearer.
 *
 * ## Why not `categoryIndexOf`, like the mouse handlers use
 *
 * Because the index is not there to read. `Bar` builds its `LabelList` entries
 * separately from its rectangles, copying over exactly `x`, `y`, `width`,
 * `height`, `viewBox`, `parentViewBox`, `value`, `fill` and `payload`
 * (`cartesian/Bar.js`, `labelListEntries`) — `originalDataIndex` is dropped on
 * the way. So the only index a label can see is the filtered, wrong one that
 * `categoryIndexOf` exists to avoid, and that is what left the 18 and the 21
 * unlabelled: "is this bar my column's label-bearer?" was asked about the wrong
 * column.
 *
 * `payload` survives, though, and it is the whole data row — so the row answers
 * the question itself. It carries `__labelBucket`, computed once by
 * `labelBucketFor` where the untransposed data is still in scope. No index
 * arithmetic survives at all, which makes this the reliable route rather than
 * merely the available one.
 *
 * ## Why `undefined` rather than a boolean plus a value
 *
 * `LabelList` calls `valueAccessor` per drawn rectangle and hands the result
 * straight to the label as `value`; `RenderableText` includes `undefined`, and
 * `TotalLabel` draws nothing for a non-number. One return value therefore says
 * both "this is the bearer" and "here is what to print", with no second channel
 * to fall out of sync.
 *
 * A guard rather than a cast, on the same grounds as `rectOf`: the entry is the
 * library's type, and asserting it would claim knowledge this file lacks.
 */
const totalForLabel = (
  entry: unknown,
  bucketIndex: number
): number | undefined => {
  if (typeof entry !== "object" || entry === null) return undefined;
  if (!("payload" in entry)) return undefined;

  const { payload } = entry;
  if (typeof payload !== "object" || payload === null) return undefined;
  if (!(LABEL_BUCKET_KEY in payload) || !(TOTAL_KEY in payload)) {
    return undefined;
  }

  const { [LABEL_BUCKET_KEY]: labelBucket, [TOTAL_KEY]: total } = payload;
  if (labelBucket !== bucketIndex) return undefined;

  return typeof total === "number" ? total : undefined;
};

/**
 * A category's own colour, if it set one. `null` means "use the bucket's".
 * A guard rather than a cast, on the same grounds as `rectOf`.
 */
const toneOverrideOf = (payload: unknown): string | null => {
  if (typeof payload !== "object" || payload === null) return null;
  if (!(TONE_KEY in payload)) return null;

  const { [TONE_KEY]: tone } = payload;
  return typeof tone === "string" && tone !== "" ? tone : null;
};

/** The topmost non-zero bucket of a data row. A guard, not a cast. */
const topBucketOf = (payload: unknown): number | null => {
  if (typeof payload !== "object" || payload === null) return null;
  if (!(LABEL_BUCKET_KEY in payload)) return null;

  const { [LABEL_BUCKET_KEY]: bucket } = payload;
  return typeof bucket === "number" ? bucket : null;
};

/** `borderRadius: '5px 5px 0 0'` — `iStackBar` 541. */
const TOP_RADIUS: [number, number, number, number] = [5, 5, 0, 0];
const NO_RADIUS: [number, number, number, number] = [0, 0, 0, 0];

/**
 * One segment of a stack, rounded **only when it is the column's topmost
 * visible one**.
 *
 * `radius` on `Bar` is a per-*series* prop, so putting it on the last bucket
 * rounded that bucket's rectangle whether or not anything was drawn above it.
 * "No date" is 0 in most columns and Recharts drops zero-height rectangles, so
 * the rounding was applied to a rectangle that did not exist — every column
 * rendered a square top except the one that happened to have a grey cap, which
 * was the only rounded one on screen.
 *
 * `__labelBucket` already names the topmost non-zero bucket per row — it is what
 * decides which segment prints the column total — so the cap reuses that answer
 * rather than deriving a second one that could disagree with it.
 */
const StackSegment = ({
  bucketIndex,
  payload,
  ...rect
}: RectangleProps & { bucketIndex?: number; payload?: unknown }) => {
  const override = toneOverrideOf(payload);

  return (
    <Rectangle
      {...rect}
      // A category's own tone wins over the bucket's `fill`, when it set one.
      fill={override ?? rect.fill}
      radius={topBucketOf(payload) === bucketIndex ? TOP_RADIUS : NO_RADIUS}
    />
  );
};

/**
 * Headroom above the tallest column, as a multiplier on the data maximum.
 *
 * `<YAxis hide />` alone gives a domain of exactly `[0, max]`, so the tallest
 * column touches the top of the plot and the total printed above it — at
 * `y - 8` — falls outside and is clipped. That is why the 18 went missing while
 * the 2 beside it showed.
 *
 * 1.12 is the prototype's own figure (`iBar` 457, `iStackBar` 531), kept because
 * it was a legibility decision there and solves the same problem here.
 */
const HEADROOM = 1.12;

/**
 * The shaded panel behind the hovered column.
 *
 * ## Why a `background`, not a `cursor`
 *
 * Recharts' `cursor` shades the whole **category slot**, which is wider than
 * the bar — it reads as a grey box floating behind the column rather than as
 * the column being picked out. A `Bar`'s `background` is drawn at the *bar's*
 * x and width, full plot height, which is the shape the emphasis wants.
 *
 * ## Why the props are all optional
 *
 * Recharts clones this element and injects the bar's geometry, so nothing is
 * passed at the call site except `activeIndex`. Every injected prop is therefore
 * optional and guarded rather than asserted — `eslint.config.mjs` bans `as`, and
 * a cast here would be claiming to know a shape the library owns.
 *
 * `originalDataIndex` rather than `index`: see `categoryIndexOf`. Recharts
 * renders one background per *drawn* rectangle, so on a series with gaps the
 * injected `index` names the wrong column.
 */
const HoverBackdrop = ({
  x,
  y,
  width,
  height,
  originalDataIndex,
  activeIndex,
}: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  originalDataIndex?: number;
  activeIndex: number | null;
}) => {
  if (originalDataIndex === undefined || originalDataIndex !== activeIndex) {
    return null;
  }
  if (
    x === undefined ||
    y === undefined ||
    width === undefined ||
    height === undefined
  ) {
    return null;
  }

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={6}
      // `fill-muted` rather than an opacity on `foreground`: the token already
      // has a light and a dark value, so the shade follows the theme.
      className="fill-muted"
    />
  );
};

/**
 * The column total, printed above the stack — the prototype's own label (167).
 *
 * ## Why it is not simply a `LabelList` on the top bar
 *
 * It was, and it disappeared from four of seven columns. Recharts renders no
 * rectangle for a zero-value segment, so a `LabelList` attached to the topmost
 * *bucket* has nothing to anchor to whenever that bucket happens to be 0 — and
 * "No date" is 0 for most categories.
 *
 * So the label is attached to every bar and renders only on the topmost bucket
 * that actually has a value for that column. Everything above it is zero and
 * therefore invisible, which makes that segment's top edge the column's top edge
 * — the label lands in the same place, for every column.
 *
 * ## Why the decision is not made here
 *
 * It was, on the injected `index`, and that is what left 18 and 21 unlabelled:
 * `index` is the position among *drawn* rectangles (`categoryIndexOf`), so
 * "is this bar the label-bearer for this column?" was asked about the wrong
 * column. `LabelList`'s `valueAccessor` sees the whole entry — including its row
 * and its true category — so `totalForLabel` answers it there and hands this
 * component a number only when it should draw. Anything else is `undefined`,
 * which is also why `value` is not merely printed but tested.
 *
 * The remaining props are injected by Recharts cloning this element, so they are
 * optional and guarded rather than asserted (`eslint.config.mjs` bans `as`).
 */
const TotalLabel = ({
  x,
  y,
  width,
  value,
  unit = "",
}: {
  x?: number;
  y?: number;
  width?: number;
  value?: string | number | boolean | null;
  /** Appended after the number — "3 items". Empty by default. */
  unit?: string;
}) => {
  if (typeof value !== "number") return null;
  if (x === undefined || y === undefined || width === undefined) return null;

  return (
    <text
      x={x + width / 2}
      y={y - 8}
      textAnchor="middle"
      className="fill-foreground text-xs font-semibold"
    >
      {unit ? `${value} ${unit}` : value}
    </text>
  );
};

/**
 * Air between the bar's top edge and the bottom of the panel.
 *
 * The panel's *own height* is handled by `-translate-y-full` on the tooltip
 * rather than arithmetic here. An earlier version estimated it from the row
 * count — `34 + rows * 18` — and was visibly wrong, because the estimate has to
 * predict the panel's padding, line height and heading in advance, and every one
 * of those is a CSS value this file cannot see. Shifting the element by 100% of
 * whatever it actually measured is exact by construction.
 */
const ANCHOR_GAP = 8;

export interface StackedBucket {
  /** Legend name for this layer of the stack. */
  name: string;
  tone: ChartTone;
}

export interface StackedCategory {
  label: string;
  /** One value per bucket, in the same order as `buckets`. */
  values: readonly number[];
  /** Overrides the bucket's tone for this category's segment. See the file docblock. */
  tone?: ChartTone;
}

interface StackedBarChartProps {
  label: string;
  buckets: readonly StackedBucket[];
  categories: readonly StackedCategory[];
  /** Drill-down. Renders a focusable button per column when provided. */
  onSelect?: (category: StackedCategory) => void;
  /** Header for the accessible table's first column. */
  categoryHeader?: string;
  /**
   * What the column total counts, for the tooltip heading — "21 **open**".
   * Omitted, the heading prints the bare number.
   */
  totalNoun?: string;
  /** Appended after each column's printed total, e.g. "3 items". */
  unit?: string;
  /**
   * The bucket legend above the chart. Off by default when there is exactly one
   * bucket and every category supplies its own `tone` — the category labels
   * under each bar already carry that meaning, and a one-row legend reading
   * "● Out of service" tells a reader nothing the per-area colour and label do
   * not (`app-source.txt` 1946's own chart has none).
   */
  showLegend?: boolean;
  className?: string;
}

export const StackedBarChart = ({
  label,
  buckets,
  categories,
  onSelect,
  categoryHeader = "Category",
  totalNoun,
  unit = "",
  showLegend = true,
  className,
}: StackedBarChartProps) => {
  /**
   * `values` is documented as one entry per bucket but nothing enforces it, and
   * three readers used to disagree when it was not: the printed total summed
   * every entry, the drawn stack divided by every entry, and the accessible
   * table read only the first `buckets.length`. Normalising once here means all
   * three read the same numbers.
   */
  const valueAt = (category: StackedCategory, index: number): number =>
    category.values[index] ?? 0;

  const totals = categories.map((category) =>
    buckets.reduce((sum, _, index) => sum + valueAt(category, index), 0)
  );

  /**
   * The highest bucket with a value in a given column — where its total label
   * goes. See `TotalLabel` for why the topmost bucket is the wrong answer.
   *
   * An all-zero column has no such bucket, and the 0 it returns is a floor
   * rather than a working answer: bucket 0 is empty too, so Recharts draws no
   * rectangle, `LabelList` gets no entry for it, and **the column prints no
   * total at all** — verified in jsdom, not assumed. That is the right outcome
   * (a `0` hovering over blank axis space reads as a mislaid label) but it is not
   * what the fallback achieves, so nothing downstream should rely on it.
   */
  const labelBucketFor = (categoryIndex: number): number => {
    const category = categories[categoryIndex];
    if (!category) return 0;

    for (let bucket = buckets.length - 1; bucket >= 0; bucket -= 1) {
      if (valueAt(category, bucket) > 0) return bucket;
    }
    return 0;
  };

  /**
   * Where the tooltip sits, in the chart's own pixel space — recomputed per
   * hover so it tracks each column's height instead of being pinned.
   *
   * `null` means "not hovering", which hands positioning back to Recharts.
   */
  const [anchorY, setAnchorY] = useState<number | null>(null);

  /*
  ⚠️ There was an `anchorX` here, holding the hovered column's midpoint and fed
  to the tooltip's `position`. It is gone, and deliberately: Recharts short-
  circuits its edge clamping for any axis given an explicit position
  (`util/tooltip/translate.js:32`), so pinning `x` was what let the panel over
  the last column be sheared off by the card's `overflow-hidden`. Recharts'
  default x-placement already follows the pointer and flips at the edge, which
  is strictly better than a centred panel that can be cut in half.
*/
  /**
   * Which *column* is hovered — a category index, not a segment.
   *
   * The distinction is the whole point. Recharts' own `activeBar` marks the one
   * segment under the pointer, so emphasising through it put a separate shadow
   * on each colour of the stack and drew dark bands between the bands. A stacked
   * column is read as one object, so the emphasis belongs to the column.
   */
  const [activeColumn, setActiveColumn] = useState<number | null>(null);

  /**
   * Places the panel just above the hovered column, whatever that column's
   * height.
   *
   * ## Why it calibrates instead of calculating
   *
   * The obvious route — take the total, divide by the axis maximum, multiply by
   * the plot height — needs three things this component does not reliably know:
   * the domain Recharts chose, the pixel height of the plot after the axis and
   * margins are subtracted, and the container's current size. All three move
   * with the viewport.
   *
   * The hovered segment already answers it. Recharts hands its handler the
   * rendered rectangle, so `height ÷ value` **is** the pixels-per-unit of the
   * y scale, measured rather than inferred. Subtracting the pixel height of the
   * segments stacked above gives the top of the column. Self-calibrating, so it
   * stays correct at every breakpoint and through any axis change.
   *
   * A zero-height segment cannot calibrate anything — `height / 0` is not a
   * scale — so those are ignored and the previous anchor stands. Hovering the
   * empty part of a short column is the common case there, and the pointer is
   * over the *band*, not the bar, so leaving the tooltip where it was is the
   * right answer rather than a fallback.
   */
  const anchorFrom = (data: unknown, bucketIndex: number) => {
    const rect = rectOf(data);
    const categoryIndex = categoryIndexOf(data);
    const category =
      categoryIndex === null ? undefined : categories[categoryIndex];
    if (!rect || !category) return;

    const value = valueAt(category, bucketIndex);
    if (value <= 0 || rect.height <= 0) return;

    const pixelsPerUnit = rect.height / value;
    const unitsAbove = buckets.reduce(
      (sum, _, index) =>
        index > bucketIndex ? sum + valueAt(category, index) : sum,
      0
    );

    // The column's top edge. The panel lifts itself off this line by its own
    // height, so nothing here needs to know how tall the panel is.
    setAnchorY(rect.y - unitsAbove * pixelsPerUnit - ANCHOR_GAP);
  };

  /*
    Recharts wants one object per category with a key per series, which is the
    transpose of how the prototype stores it. Keys are `seriesKey(i)` rather
    than bucket names — a name like "Due ≤ 7 days" is not a CSS identifier, and
    `var(--color-Due ≤ 7 days)` resolves to nothing, which paints every bar
    black. The readable name reaches the tooltip and legend via `config.label`.
  */
  const rows = categories.map((category, categoryIndex) => {
    const row: Record<string, string | number> = {
      category: category.label,
      [TOTAL_KEY]: totals[categoryIndex] ?? 0,
      // Which bar prints this column's total — see `totalForLabel` for why the
      // decision has to travel with the row rather than be made from an index.
      [LABEL_BUCKET_KEY]: labelBucketFor(categoryIndex),
      /*
        A per-category colour override, travelling on the row for the same
        reason as the two above: `StackSegment` is handed the row and nothing
        else, so this is the only way the override reaches the rectangle.
        `<Cell>` would be the usual route and is deprecated in Recharts 3 —
        and this chart already renders through a custom `shape`, so a second
        mechanism would be redundant.
      */
      [TONE_KEY]: category.tone ? VAR_BY_TONE[category.tone] : "",
    };
    buckets.forEach((_, bucketIndex) => {
      row[seriesKey(bucketIndex)] = valueAt(category, bucketIndex);
    });
    return row;
  });

  const config: ChartConfig = Object.fromEntries(
    buckets.map((bucket, index) => [
      seriesKey(index),
      { label: bucket.name, color: VAR_BY_TONE[bucket.tone] },
    ])
  );

  // One series per bucket, so the accessible table reads as a real crosstab:
  // a row per category, a column per bucket.
  const series: ChartSeries[] = buckets.map((bucket, bucketIndex) => ({
    name: bucket.name,
    data: categories.map((category) => ({
      label: category.label,
      value: valueAt(category, bucketIndex),
    })),
  }));

  return (
    <div className={cn("flex flex-col", className)}>
      {/*
        The key sits **before** the chart body and outside the SVG — that is
        where `iStackBar` puts it (app-source.txt 532, `marginBottom:12`).

        It was a `<ChartLegend verticalAlign="top">`, which is not the same
        thing: Recharts reserves plot height for its legend, so the chart shrank
        to make room for the row, and `ChartLegendContent`'s swatch is a
        hardcoded 8×8 painted with an inline `style`. `ChartKey` is 11×11 like
        the prototype's and reaches its colour through a token.
      */}
      {/*
        Suppressed by callers whose categories each carry their own `tone`: with
        one bucket, a single-row key repeats what the bar colours and the axis
        labels already say. `EquipmentOutOfServiceCard` is the case.
      */}
      {showLegend ? (
        <ChartKey marker="block" entries={buckets} className="mb-3" />
      ) : null}

      <ChartFrame label={label} series={series} categoryHeader={categoryHeader}>
        <ChartContainer config={config} className="max-h-72 w-full">
          <RechartsBarChart
            data={rows}
            margin={{ top: 24 }}
            /*
              Cleared on the way out so the next hover starts from Recharts'
              own placement rather than the last column's anchor — otherwise
              re-entering the chart flashes the panel at a stale height.
            */
            onMouseLeave={() => {
              setAnchorY(null);
              setActiveColumn(null);
            }}
            /*
              **Keeps the emphasis and the tooltip talking about the same
              column.** The tooltip's active category comes from the x-axis
              band, so it changes whenever the pointer is anywhere in a category
              slot — including the empty space *above* a short bar. The backdrop
              and the anchor came only from `Bar.onMouseEnter`, which fires on
              the drawn rectangle. Sliding horizontally across the top of the
              plot therefore left the shading parked on the first column while
              the panel showed the seventh column's numbers.

              Dropping both when the band changes to a column whose bar was not
              entered is the honest resolution: Recharts re-places the panel and
              nothing is emphasised, rather than two different columns being
              indicated at once.
            */
            onMouseMove={(state) => {
              /*
                Recharts types this as `number | TooltipIndex | null`, where
                `TooltipIndex` is a string id. Only the numeric form is a
                category position, and a `typeof` guard reads it without a cast
                — `eslint.config.mjs` forbids `as`.
              */
              const band = state.activeTooltipIndex;
              if (typeof band === "number" && band !== activeColumn) {
                setActiveColumn(null);
                setAnchorY(null);
              }
            }}
          >
            {/*
              No grid. `iStackBar` (528–543) draws legend, columns and labels
              and nothing else — the totals are printed on top of each column,
              so horizontal rules would be a second, redundant way to read the
              same numbers.
            */}
            <XAxis
              dataKey="category"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
            />
            {/* Hidden, but it is what makes the stacks share one scale. */}
            {/*
              Hidden, but it is what makes the stacks share one scale — and the
              explicit domain is what leaves room for the totals printed above
              them. See `HEADROOM`: without it the tallest column touches the
              plot's top edge and its own label is clipped away.
            */}
            <YAxis
              hide
              domain={[0, (dataMax: number) => Math.ceil(dataMax * HEADROOM)]}
            />
            <ChartTooltip
              /*
                No cursor band. Recharts shades the whole category *slot* on
                hover, which is wider than the bar and reads as a grey box
                floating behind it — the prototype highlights nothing at all
                (`iStackBar` 529), letting the tooltip carry the feedback.
              */
              cursor={false}
              /*
                **`offset={0}`, and it is what centres the panel.**

                Recharts nudges an unpinned tooltip 10px right of the pointer.
                With the panel's own `-translate-x-1/2` that put its centre 10px
                right of the column — measured, not guessed: `dashboard.spec.ts`
                caught it at 10.36px. Zeroing the offset makes the panel centre
                on the pointer exactly, and hovering a bar means the pointer is
                on that bar.

                The alternative was to pin `x` to the column's midpoint, which is
                what this used to do. That is worse, because Recharts skips its
                edge clamping for any axis given an explicit position
                (`util/tooltip/translate.js:32`) — so the last column's panel
                overhung the plot and `ui/card`'s `overflow-hidden` sheared it
                off. `offset` keeps the clamp and still centres.
              */
              offset={0}
              /*
                `y` is still pinned, to the hovered column's own top — see
                `anchorFrom`. Recharts otherwise puts the panel at the pointer,
                where it covers the segments being read, the way the prototype's
                `bottom: (bh + 30)px` avoids (`iBar` 461).

                Left `undefined` until the first hover has measured a column —
                Recharts would otherwise place the panel at the pointer for one
                frame and then move it, which is the jump that read as the
                tooltip "coming down" into place.
              */
              /*
                **Only `y` is pinned, and that is load-bearing.**
                `getTooltipTranslateXY` returns a supplied `position[key]`
                *before* it reaches any clamping
                (`recharts/es6/util/tooltip/translate.js:32`), so an explicit `x`
                silently disabled `allowEscapeViewBox.x` below. The panel was
                then centred on the last column, ~180px wide with ~40px of plot
                to its right, and `ui/card`'s `overflow-hidden` sheared off the
                overhang — the exact clipping the comment below claimed to
                prevent. Omitting `x` hands that axis back to Recharts, which
                flips the panel to the left of the pointer at the edge.
              */
              position={anchorY === null ? undefined : { y: anchorY }}
              /*
                `y` escapes, `x` does not.

                Upward is necessary: a tall column leaves no room for the panel
                inside the plot, and without this it is clipped exactly when the
                bar is most worth reading.

                Sideways is the opposite. `ui/card` is `overflow-hidden`, so a
                panel allowed past the plot's right edge is cut off by the card
                rather than floating over it. Held inside, Recharts flips it to
                the left of the pointer instead — which only works now that `x`
                is no longer pinned above.
              */
              allowEscapeViewBox={{ x: false, y: true }}
              /*
                Recharts animates the panel between positions, so moving from a
                short column to a tall one made the tooltip *slide* to its new
                height — which reads as lag, and briefly shows the new numbers at
                the old column's height. The anchor is already exact; animating
                towards it only delays being correct.
              */
              isAnimationActive={false}
              content={
                <ChartTooltipContent
                  indicator={CHART_TOOLTIP_INDICATOR}
                  /*
                    `-translate-y-full` is what makes the anchor exact: Recharts
                    places the panel's *top* at `anchorY`, and this shifts it up
                    by 100% of its own measured height, so its *bottom* lands on
                    the column top. A Tailwind class rather than a `style`
                    transform, which `eslint.config.mjs:56` forbids — and the
                    reason this needs no height estimate at all.
                  */
                  className={cn(
                    CHART_TOOLTIP_CLASS,
                    "-translate-x-1/2 -translate-y-full"
                  )}
                  /*
                    The prototype's tooltip heading carries the column total —
                    "Live Temp MOC · 21 open" (461). Without it a reader has to
                    add five numbers to learn the thing the bar's own label
                    already prints above it.
                  */
                  labelFormatter={(value, payload) => {
                    const total = totalOf(payload?.[0]?.payload);
                    return total === null
                      ? String(value)
                      : `${value} · ${total}${totalNoun ? ` ${totalNoun}` : ""}`;
                  }}
                />
              }
            />
            {buckets.map((bucket, index) => (
              <Bar
                key={bucket.name}
                dataKey={seriesKey(index)}
                stackId="stack"
                fill={`var(--color-${seriesKey(index)})`}
                /*
                  Rounded on the topmost *visible* segment, so every column caps
                  the same way and a stack reads as one column rather than a pile
                  of separate blocks. `radius` cannot do this — it is per-series
                  — see `StackSegment`. `maxWidth: o.barW||46` is the
                  prototype's own (`iStackBar` 541).
                */
                shape={<StackSegment bucketIndex={index} />}
                maxBarSize={46}
                /*
                  No grow animation. Every hover sets state, which re-renders the
                  bars, which made Recharts replay the animation — so the totals
                  above the columns blinked on each pointer move. The chart is
                  reporting a current value, not performing an entrance.
                */
                isAnimationActive={false}
                /*
                  Deliberately **not** `activeBar`. That prop re-renders only
                  the segment under the pointer, so hovering a stack lit one
                  colour band rather than the whole column — and a drop shadow
                  per segment is worse still, because the segments are adjacent
                  and each one's shadow lands on the one below, giving the column
                  seams it does not have. `HoverBackdrop` below emphasises the
                  column instead.

                  Every segment reports, because the pointer can enter a column
                  anywhere.
                */
                onMouseEnter={(data) => {
                  setActiveColumn(categoryIndexOf(data));
                  anchorFrom(data, index);
                }}
                /*
                  On **every** bar, not just the bottom one.

                  It rode on `index === 0` to avoid stacking five rects, on the
                  belief that they would darken each other. They do not:
                  `fill-muted` is an opaque token in both themes, so identical
                  overlapping rects render as one. What the single bar did cost is
                  coverage — Recharts renders a background only for a rectangle it
                  actually draws, so a column whose *bottom* bucket is 0 (two of
                  the seven here) had no backdrop to light at all.
                */
                background={<HoverBackdrop activeIndex={activeColumn} />}
              >
                {/*
                  The column total above the stack, the way the prototype
                  prints it (167).

                  Every bar carries a `LabelList`, and `TotalLabel` renders for
                  exactly one of them per column — see `labelBucketFor`. The
                  obvious alternative, attaching it only to the topmost bucket,
                  is what this replaced: Recharts draws no rectangle for a
                  zero-value segment, so a column whose top bucket is empty had
                  its total floating above nothing.
                */}
                <LabelList
                  valueAccessor={(entry) => totalForLabel(entry, index)}
                  content={<TotalLabel unit={unit} />}
                />
              </Bar>
            ))}
          </RechartsBarChart>
        </ChartContainer>
      </ChartFrame>

      {onSelect && (
        /*
          The drill-down. Recharts exposes `onClick` on a bar, which no keyboard
          can reach — the same flaw the prototype's `<div>` handler had. Real
          buttons in a row that mirrors the columns keep the interaction
          reachable and labelled.
        */
        <ul
          aria-label={`${label} — open a category`}
          className="mt-3 flex flex-wrap gap-1.5"
          data-slot="chart-drilldown"
        >
          {categories.map((category, index) => (
            <li key={category.label}>
              <button
                type="button"
                onClick={() => onSelect(category)}
                className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {category.label}
                <span className="ms-1.5 font-semibold text-foreground tabular-nums">
                  {totals[index] ?? 0}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
