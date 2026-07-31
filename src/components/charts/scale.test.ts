import { describe, expect, it } from "vitest";

import {
  bands,
  barTop,
  circumference,
  HEADROOM,
  linearHeight,
  niceMax,
  percent,
  plotArea,
  slices,
  stack,
} from "@/components/charts/scale";

const PADDING = { top: 10, right: 5, bottom: 20, left: 5 };
const PLOT = plotArea(200, 100, PADDING);

describe("plotArea", () => {
  it("subtracts padding from both axes", () => {
    expect(PLOT).toEqual({ x: 5, y: 10, width: 190, height: 70 });
  });

  it("never returns a negative dimension when padding exceeds the box", () => {
    const squashed = plotArea(10, 10, PADDING);
    expect(squashed.width).toBe(0);
    expect(squashed.height).toBe(0);
  });
});

describe("linearHeight", () => {
  it("maps a value proportionally", () => {
    expect(linearHeight(50, 100, 70)).toBe(35);
    expect(linearHeight(100, 100, 70)).toBe(70);
  });

  /**
   * A shift with no open actions is an ordinary state, not an error. Dividing
   * by a zero max would put `NaN` into an SVG attribute, which renders as a
   * silently blank chart rather than something anyone would notice.
   */
  it("returns 0 rather than NaN when max is 0", () => {
    expect(linearHeight(0, 0, 70)).toBe(0);
    expect(linearHeight(5, 0, 70)).toBe(0);
  });

  it("returns 0 for negative or non-finite input", () => {
    expect(linearHeight(-5, 100, 70)).toBe(0);
    expect(linearHeight(Number.NaN, 100, 70)).toBe(0);
    expect(linearHeight(50, Number.POSITIVE_INFINITY, 70)).toBe(0);
  });

  it("clamps a value above max to the full plot height", () => {
    expect(linearHeight(150, 100, 70)).toBe(70);
  });
});

describe("barTop", () => {
  /** SVG's origin is top-left: a taller bar has a smaller y. */
  it("puts a taller bar higher up the canvas", () => {
    expect(barTop(PLOT, 0)).toBe(80);
    expect(barTop(PLOT, 70)).toBe(10);
    expect(barTop(PLOT, 35)).toBeGreaterThan(barTop(PLOT, 70));
  });
});

describe("niceMax", () => {
  it("adds the prototype's headroom above the peak", () => {
    expect(niceMax([1, 5, 3])).toBeCloseTo(5 * HEADROOM);
  });

  it("is 0 for an all-zero or empty series, so linearHeight short-circuits", () => {
    expect(niceMax([])).toBe(0);
    expect(niceMax([0, 0])).toBe(0);
  });

  it("ignores non-finite values rather than propagating them", () => {
    expect(niceMax([2, Number.NaN, 4])).toBeCloseTo(4 * HEADROOM);
  });
});

describe("bands", () => {
  it("spaces categories evenly and centres each bar in its slot", () => {
    const [first, second] = bands(PLOT, 2, 0);

    expect(first?.center).toBeCloseTo(52.5);
    expect(second?.center).toBeCloseTo(147.5);
    expect(first?.width).toBeCloseTo(95);
  });

  it("leaves a gap of gapRatio inside each slot", () => {
    const [band] = bands(PLOT, 2, 0.5);
    expect(band?.width).toBeCloseTo(47.5);
  });

  it("caps the bar width so two categories do not render as slabs", () => {
    const [band] = bands(PLOT, 2, 0, 20);
    expect(band?.width).toBe(20);
    // Still centred once capped.
    expect(band?.x).toBeCloseTo(52.5 - 10);
  });

  it("returns nothing for an empty category list", () => {
    expect(bands(PLOT, 0)).toEqual([]);
  });
});

describe("stack", () => {
  it("splits a column proportionally and fills it exactly", () => {
    const segments = stack(PLOT, [1, 3], 40);
    const total = segments.reduce((sum, segment) => sum + segment.height, 0);

    expect(total).toBeCloseTo(40);
    expect(segments[0]?.height).toBeCloseTo(10);
    expect(segments[1]?.height).toBeCloseTo(30);
  });

  it("stacks bottom-up — the first segment sits on the baseline", () => {
    const [first, second] = stack(PLOT, [1, 1], 40);
    const baseline = PLOT.y + PLOT.height;

    expect(first?.y).toBeCloseTo(baseline - 20);
    expect(second?.y).toBeCloseTo(baseline - 40);
  });

  it("collapses to zero-height segments when the column total is 0", () => {
    const segments = stack(PLOT, [0, 0], 40);
    expect(segments.every((segment) => segment.height === 0)).toBe(true);
  });

  it("treats a negative value as 0 rather than inverting the stack", () => {
    const segments = stack(PLOT, [-5, 5], 40);
    expect(segments[0]?.height).toBe(0);
    expect(segments[1]?.height).toBeCloseTo(40);
  });
});

describe("slices", () => {
  const RADIUS = 50;
  const CIRCLE = circumference(RADIUS);

  it("divides the circle in proportion to the values", () => {
    const [half, quarter] = slices([2, 1], RADIUS);

    expect(half?.fraction).toBeCloseTo(2 / 3);
    expect(half?.dash).toBeCloseTo((2 / 3) * CIRCLE);
    expect(quarter?.fraction).toBeCloseTo(1 / 3);
  });

  it("dash and gap always sum to the full circumference", () => {
    for (const slice of slices([5, 3, 2], RADIUS)) {
      expect(slice.dash + slice.gap).toBeCloseTo(CIRCLE);
    }
  });

  it("offsets each slice to start where the previous ended", () => {
    const [first, second, third] = slices([1, 1, 2], RADIUS);

    expect(first?.offset).toBeCloseTo(0);
    expect(second?.offset).toBeCloseTo(-CIRCLE / 4);
    expect(third?.offset).toBeCloseTo(-CIRCLE / 2);
  });

  /** An arc path cannot express a full circle in one command; a dash can. */
  it("draws a single-value series as the whole ring", () => {
    const [only] = slices([7], RADIUS);
    expect(only?.fraction).toBe(1);
    expect(only?.dash).toBeCloseTo(CIRCLE);
    expect(only?.gap).toBeCloseTo(0);
  });

  it("returns empty slices for an all-zero series", () => {
    const result = slices([0, 0], RADIUS);
    expect(result.every((slice) => slice.dash === 0)).toBe(true);
    expect(result.every((slice) => slice.fraction === 0)).toBe(true);
  });
});

describe("percent", () => {
  it("renders a whole percentage", () => {
    expect(percent(0.5)).toBe("50%");
    expect(percent(0)).toBe("0%");
    expect(percent(1)).toBe("100%");
    expect(percent(1 / 3)).toBe("33%");
  });
});
