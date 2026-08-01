/**
 * Every value → pixel mapping in every chart, in one place.
 *
 * **Why this file exists at all.** Two constraints meet here:
 *
 * 1. `eslint.config.mjs:56` bans the `style` JSX attribute outright, including
 *    the `style={{'--h': …}}` custom-property trick. The prototype's bar charts
 *    set a per-bar pixel height that way (`iBar` app-source.txt 463,
 *    `iStackBar` 541), so they cannot be ported as divs. Everything becomes SVG,
 *    where geometry is an *attribute* rather than a style — which is also what
 *    makes `viewBox` responsiveness and a single `role="img"` wrapper possible.
 * 2. **NFR-07** makes Arabic and full RTL first-class. SVG geometry is
 *    inherently left-to-right: `x`, `width`, `x1/x2` and path commands are
 *    absolute in user space and `dir="rtl"` does not mirror them. Deferring the
 *    Arabic layer is only cheap if the retrofit is a wrapper transform plus a
 *    counter-flip on `<text>` — and that is only true while no primitive
 *    computes an `x` inline. This module is what keeps that promise.
 *
 * Nothing here knows about React, colour, or the DOM. It is arithmetic, which
 * is why it can be unit-tested exhaustively without rendering anything.
 */

/** The drawing area inside a chart's `viewBox`, after padding. */
export interface Plot {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const plotArea = (
  width: number,
  height: number,
  padding: Padding
): Plot => ({
  x: padding.left,
  y: padding.top,
  width: Math.max(0, width - padding.left - padding.right),
  height: Math.max(0, height - padding.top - padding.bottom),
});

/**
 * Maps a value in `[0, max]` to a bar height in `[0, plotHeight]`.
 *
 * `max` of zero is the real case, not a defensive one: a shift with no open
 * actions is a legitimate, common state, and dividing by it would put `NaN`
 * into an SVG attribute — which renders as a silently invisible chart rather
 * than an error. Returns 0 instead.
 */
export const linearHeight = (
  value: number,
  max: number,
  plotHeight: number
): number => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (!Number.isFinite(max) || max <= 0) return 0;
  return Math.min(plotHeight, (value / max) * plotHeight);
};

/**
 * `y` for a bar of `height` sitting on the plot's baseline. SVG's origin is
 * top-left, so a taller bar has a *smaller* y — the single most common place to
 * get a bar chart upside down.
 */
export const barTop = (plot: Plot, height: number): number =>
  plot.y + plot.height - height;

/**
 * The prototype scales bars against `max * 1.12` so the tallest never touches
 * the top of the card (`iBar` 457, `iStackBar` 531). Kept, because it is a
 * legibility decision rather than an accident.
 */
export const HEADROOM = 1.12;

export const niceMax = (values: readonly number[]): number => {
  const peak = values.reduce(
    (highest, value) =>
      Number.isFinite(value) && value > highest ? value : highest,
    0
  );
  return peak <= 0 ? 0 : peak * HEADROOM;
};

/**
 * Evenly spaced slots across the plot, one per category — SVG's equivalent of
 * the prototype's `flex: 1` columns.
 *
 * `gapRatio` is the share of each slot left empty, so bars have air between
 * them without the caller doing arithmetic.
 */
export interface Band {
  /** Left edge of this category's slot. */
  x: number;
  /** Width of the bar itself, inside the slot. */
  width: number;
  /** Horizontal centre — where a label or tooltip anchors. */
  center: number;
}

export const bands = (
  plot: Plot,
  count: number,
  gapRatio = 0.3,
  maxBarWidth = Number.POSITIVE_INFINITY
): Band[] => {
  if (count <= 0) return [];

  const slot = plot.width / count;
  const width = Math.min(slot * (1 - gapRatio), maxBarWidth);

  return Array.from({ length: count }, (_, index) => {
    const center = plot.x + slot * index + slot / 2;
    return { x: center - width / 2, width, center };
  });
};

/**
 * Stacks segment heights bottom-up, returning each segment's `y` and height.
 *
 * Proportional to the *column total*, not to the axis max, so a stacked column
 * always fills exactly the height its total earns — which is what makes two
 * columns comparable at a glance.
 */
export interface Segment {
  y: number;
  height: number;
}

export const stack = (
  plot: Plot,
  values: readonly number[],
  columnHeight: number
): Segment[] => {
  const total = values.reduce(
    (sum, value) => sum + (Number.isFinite(value) && value > 0 ? value : 0),
    0
  );
  if (total <= 0) return values.map(() => ({ y: barTop(plot, 0), height: 0 }));

  let consumed = 0;

  return values.map((value) => {
    const safe = Number.isFinite(value) && value > 0 ? value : 0;
    const height = (safe / total) * columnHeight;
    const y = plot.y + plot.height - consumed - height;
    consumed += height;
    return { y, height };
  });
};

/**
 * Row positions for a horizontal chart — `bands()` transposed. `rowHeight` is
 * the full slot a category owns (bar plus the gap after it); `barHeight` is
 * how tall the bar drawn in that slot actually is, centred in the slot rather
 * than tied to its ratio, because a horizontal stacked bar's bar height is a
 * legibility constant (`iHStack`'s `height:22`, app-source.txt 1892) rather
 * than something that should shrink as more categories are added.
 */
export interface Row {
  /** Top edge of this category's bar. */
  y: number;
  /** Vertical centre — where a label or total anchors its baseline. */
  center: number;
}

export const rows = (
  plot: Plot,
  count: number,
  rowHeight: number,
  barHeight: number
): Row[] => {
  if (count <= 0) return [];

  return Array.from({ length: count }, (_, index) => {
    const center = plot.y + rowHeight * index + rowHeight / 2;
    return { y: center - barHeight / 2, center };
  });
};

/**
 * One category's bucket values turned into left-to-right segment positions
 * within a single row — `iHStack`'s geometry (app-source.txt 1892:
 * `width:(v/tot*100)+'%'`), computed in user units instead of a CSS percentage
 * so it can sit on an SVG `<rect>`.
 *
 * Proportional to the *row's own total*, not a shared axis maximum — every
 * row fills exactly its `rowWidth`, which is what makes `iHStack` a 100%
 * stacked bar rather than `StackedBarChart`'s "tallest total sets the scale"
 * chart.
 */
export interface HorizontalSegment {
  x: number;
  width: number;
  /** Share of the row's total, 0–1 — what the accessible table would report. */
  fraction: number;
}

export const horizontalStack = (
  rowX: number,
  rowWidth: number,
  values: readonly number[]
): HorizontalSegment[] => {
  const total = values.reduce(
    (sum, value) => sum + (Number.isFinite(value) && value > 0 ? value : 0),
    0
  );
  if (total <= 0) return values.map(() => ({ x: rowX, width: 0, fraction: 0 }));

  let consumed = 0;

  return values.map((value) => {
    const safe = Number.isFinite(value) && value > 0 ? value : 0;
    const fraction = safe / total;
    const width = fraction * rowWidth;
    const x = rowX + consumed;
    consumed += width;
    return { x, width, fraction };
  });
};

/* -------------------------------------------------------------------------- */
/* Pie / donut geometry                                                        */
/* -------------------------------------------------------------------------- */

/**
 * A pie slice as a stroke-dash pair on a circle — the technique the prototype
 * uses (`iPie` app-source.txt 501) rather than an arc path.
 *
 * It is genuinely the better choice here: one `<circle>` per slice with a
 * `stroke-dasharray` needs no trigonometry, cannot produce a malformed path,
 * and degenerates correctly when a slice is 100% (an arc path cannot draw a
 * full circle in one command).
 */
export interface Slice {
  /** Length of the visible arc, in user units. */
  dash: number;
  /** Length of the gap that follows it. */
  gap: number;
  /** Negative offset that rotates this slice to start where the last ended. */
  offset: number;
  /** Share of the whole, 0–1 — what the accessible table reports. */
  fraction: number;
}

export const circumference = (radius: number): number => 2 * Math.PI * radius;

export const slices = (values: readonly number[], radius: number): Slice[] => {
  const circle = circumference(radius);
  const total = values.reduce(
    (sum, value) => sum + (Number.isFinite(value) && value > 0 ? value : 0),
    0
  );

  if (total <= 0) {
    return values.map(() => ({ dash: 0, gap: circle, offset: 0, fraction: 0 }));
  }

  let consumed = 0;

  return values.map((value) => {
    const safe = Number.isFinite(value) && value > 0 ? value : 0;
    const fraction = safe / total;
    const dash = fraction * circle;
    const offset = -(consumed / total) * circle;
    consumed += safe;
    return { dash, gap: circle - dash, offset, fraction };
  });
};

/** `0.5` → `"50%"`, rounded for display. Percentages are always whole here. */
export const percent = (fraction: number): string =>
  `${Math.round(fraction * 100)}%`;
