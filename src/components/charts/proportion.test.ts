import { describe, expect, it } from "vitest";

import {
  BAR_HEIGHT_CLASS,
  PERCENT_BASIS,
  PLOT_HEIGHT,
  apportion,
  barHeightClass,
  basisClass,
  percentOfMax,
} from "@/components/charts/proportion";

/**
 * The arithmetic that replaced this library's SVG geometry for the two bar
 * charts. Pure functions, so they can be exercised exhaustively without
 * rendering anything — the same rationale `scale.test.ts` gives.
 */

describe("PERCENT_BASIS", () => {
  it("covers every whole percent from 0 to 100", () => {
    expect(PERCENT_BASIS).toHaveLength(101);
  });

  /**
   * Tailwind's scanner reads source text, so each class must be present
   * verbatim. A table built by a loop would pass a length check and still
   * generate no CSS — this pins the literal spelling.
   */
  it("spells each entry as the class for its own index", () => {
    for (const [index, className] of PERCENT_BASIS.entries()) {
      expect(className).toBe(`basis-[${index}%]`);
    }
  });
});

describe("basisClass", () => {
  it("returns the class for a whole percent", () => {
    expect(basisClass(37)).toBe("basis-[37%]");
  });

  it("rounds a fractional percent to the nearest entry", () => {
    expect(basisClass(37.4)).toBe("basis-[37%]");
    expect(basisClass(37.6)).toBe("basis-[38%]");
  });

  it("clamps out-of-range input rather than returning undefined", () => {
    expect(basisClass(-10)).toBe("basis-[0%]");
    expect(basisClass(140)).toBe("basis-[100%]");
  });
});

describe("apportion", () => {
  it("splits an even three-way share into exactly 100", () => {
    const shares = apportion([1, 1, 1]);
    expect(shares.reduce((sum, value) => sum + value, 0)).toBe(100);
  });

  /**
   * The reason this is largest-remainder rather than `Math.round` per bucket:
   * a 100%-stacked bar whose segments total 99% shows a sliver of empty track,
   * and one totalling 101% overflows the rounded end.
   */
  it("always totals exactly 100 for any non-zero input", () => {
    const cases = [
      [3, 4, 7, 3, 1],
      [1, 1, 1, 1, 1, 1, 1],
      [2, 3, 4, 1],
      [1],
      [1, 2],
      [999, 1],
      [1, 1, 1, 1, 1, 1],
    ];

    for (const values of cases) {
      const shares = apportion(values);
      expect(shares.reduce((sum, value) => sum + value, 0)).toBe(100);
    }
  });

  it("gives a zero bucket no share, even when points are left to hand out", () => {
    const shares = apportion([1, 0, 1, 0, 1]);
    expect(shares[1]).toBe(0);
    expect(shares[3]).toBe(0);
    expect(shares.reduce((sum, value) => sum + value, 0)).toBe(100);
  });

  /** A category with nothing open is a normal state, not a divide-by-zero. */
  it("returns all zeros for an all-zero or empty input", () => {
    expect(apportion([0, 0, 0])).toEqual([0, 0, 0]);
    expect(apportion([])).toEqual([]);
  });

  it("ignores negative and non-finite values rather than propagating them", () => {
    const shares = apportion([5, -3, Number.NaN, 5]);
    expect(shares[1]).toBe(0);
    expect(shares[2]).toBe(0);
    expect(shares.reduce((sum, value) => sum + value, 0)).toBe(100);
  });

  it("keeps a larger bucket's share at least as large as a smaller one's", () => {
    const shares = apportion([10, 5, 1]);
    expect(shares[0]).toBeGreaterThan(shares[1] ?? 0);
    expect(shares[1]).toBeGreaterThan(shares[2] ?? 0);
  });
});

describe("percentOfMax", () => {
  it("scales a value against the chart maximum", () => {
    expect(percentOfMax(5, 10)).toBe(50);
  });

  it("caps at 100 rather than overflowing the plot", () => {
    expect(percentOfMax(15, 10)).toBe(100);
  });

  /** A shift with nothing out of service is common; NaN geometry is not. */
  it("returns 0 for a zero or non-finite maximum", () => {
    expect(percentOfMax(5, 0)).toBe(0);
    expect(percentOfMax(5, Number.NaN)).toBe(0);
  });

  it("returns 0 for a zero or negative value", () => {
    expect(percentOfMax(0, 10)).toBe(0);
    expect(percentOfMax(-4, 10)).toBe(0);
  });
});

describe("BAR_HEIGHT_CLASS", () => {
  it("covers 31 steps of 4px each, from 0 to PLOT_HEIGHT", () => {
    expect(BAR_HEIGHT_CLASS).toHaveLength(31);
    expect(PLOT_HEIGHT).toBe(120);
  });

  /**
   * Tailwind's scanner reads source text, so each class must be present
   * verbatim — the same reason `PERCENT_BASIS`'s own test pins its spelling.
   */
  it("spells each entry as the class for its own index", () => {
    for (const [index, className] of BAR_HEIGHT_CLASS.entries()) {
      expect(className).toBe(`h-${index}`);
    }
  });
});

describe("barHeightClass", () => {
  it("returns an absolute height class, not a percentage", () => {
    expect(barHeightClass(100)).toBe("h-30");
    expect(barHeightClass(0)).toBe("h-0");
  });

  /**
   * The whole reason this exists rather than reusing `basisClass`: the
   * bar's column is deliberately `auto`-height (`StackedBarChart.tsx`'s own
   * comment), and a percentage `flex-basis` cannot resolve against that —
   * only an absolute height can size the bar independently of its parent.
   */
  it("rounds to the nearest of 31 discrete steps rather than a percentage", () => {
    // 10/11.2 ≈ 89% → step 27 (89/100*30 = 26.7, rounds up).
    expect(barHeightClass(89)).toBe("h-27");
    // 2/11.2 ≈ 18% → step 5 (18/100*30 = 5.4, rounds down).
    expect(barHeightClass(18)).toBe("h-5");
  });

  it("clamps out-of-range input rather than returning undefined", () => {
    expect(barHeightClass(-10)).toBe("h-0");
    expect(barHeightClass(140)).toBe("h-30");
  });
});
