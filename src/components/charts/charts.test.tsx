import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ChartFrame } from "@/components/charts/ChartFrame";
import { ChartKindToggle } from "@/components/charts/ChartKindToggle";
import { HorizontalStackedBarChart } from "@/components/charts/HorizontalStackedBarChart";
import { KpiTrendCard } from "@/components/charts/KpiTrendCard";
import { PieChart } from "@/components/charts/PieChart";
import { Sparkline } from "@/components/charts/Sparkline";
import { StackedBarChart } from "@/components/charts/StackedBarChart";

/**
 * The contract every chart primitive owes.
 *
 * `SCREENS.md` records the prototype's gap plainly — *"Charts have no
 * accessible equivalent — SVG with no labels or table fallback"* — and
 * `.claude/rules/03` sets the bar at WCAG 2.1 AA. These assertions are what
 * stop a future primitive shipping without closing it.
 */

const PIE_DATA = [
  { label: "Open", value: 6, tone: "chart-1" },
  { label: "In Progress", value: 3, tone: "chart-2" },
  { label: "On Hold", value: 1, tone: "chart-3" },
] as const;

describe("ChartFrame", () => {
  it("exposes the drawing as one labelled image", () => {
    render(
      <ChartFrame
        label="Pending actions by status"
        width={100}
        height={100}
        series={[{ name: "Actions", data: [{ label: "Open", value: 6 }] }]}
      >
        <rect x={0} y={0} width={10} height={10} />
      </ChartFrame>
    );

    expect(
      screen.getByRole("img", { name: "Pending actions by status" })
    ).toBeInTheDocument();
  });

  it("publishes the series as a real table, not a longer aria-label", () => {
    render(
      <ChartFrame
        label="Pending actions by status"
        width={100}
        height={100}
        categoryHeader="Status"
        series={[
          {
            name: "Actions",
            data: [
              { label: "Open", value: 6 },
              { label: "On Hold", value: 1 },
            ],
          },
        ]}
      >
        <rect x={0} y={0} width={10} height={10} />
      </ChartFrame>
    );

    const table = screen.getByRole("table", {
      name: "Pending actions by status",
    });
    expect(table).toBeInTheDocument();

    expect(
      screen.getByRole("columnheader", { name: "Status" })
    ).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "Open" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "6" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "1" })).toBeInTheDocument();
  });

  /**
   * `sr-only`, not `hidden`. A hidden element is removed from the accessibility
   * tree, which would delete the very thing this exists to provide — so the
   * table must remain queryable by role.
   */
  it("keeps the table in the accessibility tree while hiding it visually", () => {
    render(
      <ChartFrame
        label="Chart"
        width={10}
        height={10}
        series={[{ name: "A", data: [{ label: "x", value: 1 }] }]}
      >
        <rect x={0} y={0} width={1} height={1} />
      </ChartFrame>
    );

    const table = screen.getByRole("table", { name: "Chart" });
    expect(table).toHaveClass("sr-only");
    expect(table).not.toHaveAttribute("hidden");
    expect(table).not.toHaveAttribute("aria-hidden");
  });

  it("scales by viewBox rather than a pixel width", () => {
    const { container } = render(
      <ChartFrame
        label="Chart"
        width={640}
        height={260}
        series={[{ name: "A", data: [] }]}
      >
        <rect x={0} y={0} width={1} height={1} />
      </ChartFrame>
    );

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("viewBox", "0 0 640 260");
    expect(svg).not.toHaveAttribute("width");
    expect(svg).not.toHaveAttribute("height");
  });

  /**
   * `sr-only`'s `width:1px` does not constrain a `<table>` under the default
   * `table-layout:auto` once `white-space:nowrap` forbids wrapping — the table
   * renders at its full unwrapped content width regardless, which is invisible
   * but (being `position:absolute`) still enlarges the page's own scrollable
   * area once a wide-enough crosstab pushes it past the viewport. `table-fixed`
   * makes the table honour the 1px width for real. jsdom does not lay out CSS,
   * so this only pins the class staying present — the 375px regression itself
   * is `e2e/trends.spec.ts`'s job.
   */
  it("constrains the accessible table's layout so a wide crosstab cannot expand the page", () => {
    render(
      <ChartFrame
        label="Chart"
        width={10}
        height={10}
        series={[{ name: "A", data: [{ label: "x", value: 1 }] }]}
      >
        <rect x={0} y={0} width={1} height={1} />
      </ChartFrame>
    );

    expect(screen.getByRole("table", { name: "Chart" })).toHaveClass(
      "table-fixed"
    );
  });

  it("renders a dash where a series has no value for a category", () => {
    render(
      <ChartFrame
        label="Chart"
        width={10}
        height={10}
        series={[
          { name: "A", data: [{ label: "one", value: 1 }] },
          { name: "B", data: [{ label: "two", value: 2 }] },
        ]}
      >
        <rect x={0} y={0} width={1} height={1} />
      </ChartFrame>
    );

    expect(screen.getAllByRole("cell", { name: "—" })).toHaveLength(2);
  });
});

describe("PieChart", () => {
  it("labels the chart and tabulates every slice with its share", () => {
    render(<PieChart label="Pending actions by status" data={PIE_DATA} />);

    expect(
      screen.getByRole("img", { name: "Pending actions by status" })
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "6 (60%)" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "3 (30%)" })).toBeInTheDocument();
  });

  it("defaults the centre readout to the total", () => {
    render(<PieChart label="Chart" data={PIE_DATA} />);
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("renders an empty ring rather than nothing for an all-zero series", () => {
    const { container } = render(
      <PieChart
        label="Chart"
        data={[{ label: "Open", value: 0, tone: "chart-1" }]}
      />
    );

    // "no data" and "failed to render" must not look identical.
    expect(container.querySelector(".stroke-border")).toBeInTheDocument();
  });

  /**
   * The centre number duplicates what ChartFrame's table already reports, so it
   * must not be announced again.
   *
   * Asserted through the *specific* node: an earlier version queried
   * `[aria-hidden]` generally and passed even with the attribute removed,
   * because the legend swatches also match. A test that cannot fail is worse
   * than no test.
   */
  it("hides the centre readout from assistive technology", () => {
    render(<PieChart label="Chart" data={PIE_DATA} />);

    const readout = screen.getByText("10");
    expect(readout.closest("[aria-hidden]")).not.toBeNull();
  });
});

describe("StackedBarChart", () => {
  const BUCKETS = [
    { name: "Overdue", tone: "chart-5" },
    { name: "Due soon", tone: "chart-3" },
  ] as const;

  const CATEGORIES = [
    { label: "B-train", values: [2, 3] },
    { label: "Unit 3", values: [1, 4] },
  ];

  it("tabulates as a crosstab — a row per category, a column per bucket", () => {
    render(
      <StackedBarChart
        label="Open actions by area"
        buckets={BUCKETS}
        categories={CATEGORIES}
      />
    );

    expect(
      screen.getByRole("img", { name: "Open actions by area" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Overdue" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("rowheader", { name: "B-train" })
    ).toBeInTheDocument();
  });

  it("renders one segment per non-zero bucket", () => {
    const { container } = render(
      <StackedBarChart
        label="Chart"
        buckets={BUCKETS}
        categories={[{ label: "B-train", values: [2, 0] }]}
      />
    );

    expect(container.querySelectorAll("[title]")).toHaveLength(1);
    expect(container.querySelector("[title]")).toHaveAttribute(
      "title",
      "Overdue: 2"
    );
  });

  /**
   * The structural fix this chart exists in its current form for: an
   * `<svg viewBox>` with `w-full` scales its contents by
   * `container_width / viewBox_width`, so a 12px label was 12 *user units* and
   * rendered at a different size in every container. Boxes have no such layer.
   */
  it("draws with no scaling layer, so declared sizes are real pixels", () => {
    const { container } = render(
      <StackedBarChart
        label="Chart"
        buckets={BUCKETS}
        categories={CATEGORIES}
      />
    );

    expect(container.querySelector("svg")).toBeNull();
    expect(
      container.querySelector("[data-slot='chart-columns']")
    ).not.toBeNull();
  });

  /**
   * The prototype hangs its drill-down on a `<div>` click handler
   * (app-source.txt 536), which no keyboard can reach. This is the regression
   * guard for that.
   */
  it("exposes the drill-down as keyboard-reachable buttons", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <StackedBarChart
        label="Chart"
        buckets={BUCKETS}
        categories={CATEGORIES}
        onSelect={onSelect}
      />
    );

    const button = screen.getByRole("button", { name: /B-train/ });
    expect(button).toHaveAttribute("type", "button");

    await user.click(button);
    expect(onSelect).toHaveBeenCalledWith(CATEGORIES[0]);
  });

  it("renders no drill-down affordance when none is offered", () => {
    render(
      <StackedBarChart
        label="Chart"
        buckets={BUCKETS}
        categories={CATEGORIES}
      />
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("survives an all-zero column without emitting NaN geometry", () => {
    const { container } = render(
      <StackedBarChart
        label="Chart"
        buckets={BUCKETS}
        categories={[{ label: "Quiet", values: [0, 0] }]}
      />
    );

    for (const element of container.querySelectorAll("*")) {
      expect(element.className.toString()).not.toContain("NaN");
    }
    // No value means no segment to draw — an empty track, not a zero-width one.
    expect(container.querySelectorAll("[title]")).toHaveLength(0);
  });

  /** `iBar`'s own call passes `unit:'items'` (app-source.txt 1946); default stays bare. */
  it("appends the unit to the printed total when given one", () => {
    render(
      <StackedBarChart
        label="Chart"
        buckets={[{ name: "Out of service", tone: "chart-1" }]}
        categories={[{ label: "Train 2", values: [3] }]}
        unit="items"
      />
    );

    expect(screen.getByText("3 items")).toBeInTheDocument();
  });

  it("prints a bare total when no unit is given", () => {
    const { container } = render(
      <StackedBarChart
        label="Chart"
        buckets={[{ name: "Out of service", tone: "chart-1" }]}
        categories={[{ label: "Train 2", values: [3] }]}
      />
    );

    // Scoped to the drawn column, not the accessible table's own "3" cell.
    const columns = container.querySelector("[data-slot='chart-columns']");
    expect(columns?.querySelector("span")?.textContent).toBe("3");
    expect(screen.queryByText("3 items")).not.toBeInTheDocument();
  });

  /**
   * The `<ul>` legend is what `showLegend` controls — the accessible table's
   * own column header still names the bucket regardless, since that table
   * must carry full information independent of what the sighted legend
   * shows.
   */
  it("hides the legend when showLegend is false", () => {
    const { container } = render(
      <StackedBarChart
        label="Chart"
        buckets={[{ name: "Out of service", tone: "chart-1" }]}
        categories={CATEGORIES}
        showLegend={false}
      />
    );

    expect(container.querySelector("ul")).not.toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Out of service" })
    ).toBeInTheDocument();
  });

  /**
   * A per-area "by area" chart wants one colour per category, not one shared
   * bucket colour — `EquipmentOutOfServiceCard`'s only caller with more than
   * one category and a single bucket.
   */
  it("lets a category's own tone override the bucket's", () => {
    const { container } = render(
      <StackedBarChart
        label="Chart"
        buckets={[{ name: "Out of service", tone: "chart-1" }]}
        categories={[
          { label: "Train 2", values: [3], tone: "chart-6" },
          { label: "Train 3", values: [1], tone: "chart-7" },
        ]}
      />
    );

    const segments = container.querySelectorAll("[title]");
    expect(segments[0]).toHaveClass("bg-chart-6");
    expect(segments[1]).toHaveClass("bg-chart-7");
  });

  /**
   * `iBar` scales columns against `max * 1.12` so the tallest never touches
   * the value label above it (`niceMax`), and a shorter column must be
   * visibly shorter — the whole point of a bar chart.
   */
  it("gives a larger value a taller column", () => {
    const { container } = render(
      <StackedBarChart
        label="Chart"
        buckets={[{ name: "Out of service", tone: "chart-1" }]}
        categories={[
          { label: "Big", values: [10] },
          { label: "Small", values: [2] },
        ]}
      />
    );

    const bars = [...container.querySelectorAll("[title]")].map(
      (segment) => segment.parentElement
    );
    // An absolute `h-N` height, not a percentage `flex-basis` — the bar's
    // column has no height of its own to be a percentage of (see the file
    // docblock). `h-27` (108px) vs `h-5` (20px) — 10/11.2 and 2/11.2 of
    // `PLOT_HEIGHT`'s 30 steps.
    expect(bars[0]?.className).toContain("h-27");
    expect(bars[1]?.className).toContain("h-5");
    // Genuinely two different heights, not the same class twice.
    expect(bars[0]?.className).not.toContain("h-5 ");
  });

  /**
   * The structural bug this geometry exists to fix: a `flex-1` "well" inside
   * an `h-full` column absorbed all vertical slack regardless of the bar's
   * own height, so every value label sat at the same fixed height instead of
   * directly above its own bar. Pinned by asserting the column has no
   * explicit height and the bar's height class is absolute, not relative.
   */
  it("lets the column shrink-wrap so its label sits above its own bar", () => {
    const { container } = render(
      <StackedBarChart
        label="Chart"
        buckets={[{ name: "Out of service", tone: "chart-1" }]}
        categories={[{ label: "Solo", values: [5] }]}
      />
    );

    const column = container.querySelector("[data-slot='chart-columns'] > div");
    expect(column?.className).not.toContain("h-full");

    const bar = container.querySelector("[title]")?.parentElement;
    expect(bar?.className).toMatch(/\bh-\d+\b/);
    expect(bar?.className).not.toMatch(/basis-\[/);
  });
});

describe("Sparkline", () => {
  const VALUES = [42, 43, 45, 44, 46, 43, 44];

  it("labels the chart and tabulates every point", () => {
    render(
      <Sparkline label="ADP daily trend" values={VALUES} tone="chart-1" />
    );

    expect(
      screen.getByRole("img", { name: "ADP daily trend" })
    ).toBeInTheDocument();
    // 42 is the series' first (and only) value of 42, unlike 44 which repeats.
    expect(screen.getByRole("cell", { name: "42" })).toBeInTheDocument();
  });

  it("draws one bar per value", () => {
    const { container } = render(
      <Sparkline label="Chart" values={VALUES} tone="chart-1" />
    );
    expect(container.querySelectorAll("rect")).toHaveLength(VALUES.length);
  });

  /**
   * The prototype's own geometry (`Math.max(3,...)`, app-source.txt 381): a
   * zero value still draws a visible sliver rather than nothing, so "no data"
   * and "value is zero" do not look identical.
   */
  it("gives a zero value a visible sliver rather than no bar at all", () => {
    const { container } = render(
      <Sparkline label="Chart" values={[0, 0, 0]} tone="chart-1" />
    );

    const heights = [...container.querySelectorAll("rect")].map((rect) =>
      Number(rect.getAttribute("height"))
    );
    expect(heights.every((height) => height >= 3)).toBe(true);
  });

  it("dims every bar but the most recent", () => {
    const { container } = render(
      <Sparkline label="Chart" values={[1, 2, 3]} tone="chart-1" />
    );

    const rects = [...container.querySelectorAll("rect")];
    expect(
      rects.slice(0, -1).every((rect) => rect.classList.contains("opacity-40"))
    ).toBe(true);
    expect(rects.at(-1)).not.toHaveClass("opacity-40");
  });
});

describe("KpiTrendCard", () => {
  const ADP = {
    code: "ADP",
    fullLabel: "Agreed Daily Prod.",
    unit: "MM",
    values: [42, 43, 45, 44, 46, 43, 44],
    tone: "chart-1" as const,
  };

  /**
   * `getByText` alone is ambiguous here: the embedded `Sparkline`'s hidden
   * accessible table repeats several of these same numbers as table cells.
   * Scoping to the visible headline element is what makes the assertion
   * about the *card's* number rather than any number on the page.
   */
  it("shows the code, latest value and unit", () => {
    const { container } = render(<KpiTrendCard {...ADP} />);

    expect(screen.getByText("ADP")).toBeInTheDocument();
    expect(container.querySelector(".text-2xl")?.textContent).toBe("44");
    expect(screen.getByText("MM")).toBeInTheDocument();
  });

  it("labels an increase in text, not colour alone", () => {
    // 43 -> 44, the series' last two points, is +1.
    render(<KpiTrendCard {...ADP} />);
    expect(screen.getByText("+1 MM vs prev")).toBeInTheDocument();
  });

  it("labels a decrease with a minus sign, not colour alone", () => {
    render(<KpiTrendCard {...ADP} values={[0, 0, 1.2, 0, 0, 0.6, 0]} />);
    expect(screen.getByText("-0.6 MM vs prev")).toBeInTheDocument();
  });

  it("says 'no change' rather than printing a bare 0", () => {
    render(<KpiTrendCard {...ADP} values={[5, 5]} />);
    expect(screen.getByText("no change vs prev")).toBeInTheDocument();
    expect(screen.queryByText("+0 MM vs prev")).not.toBeInTheDocument();
  });

  it("shows no delta when there is only one point to show", () => {
    render(<KpiTrendCard {...ADP} values={[44]} />);
    expect(screen.queryByText(/vs prev/)).not.toBeInTheDocument();
  });

  it("reports avg, min and max across the whole series", () => {
    const { container } = render(<KpiTrendCard {...ADP} />);
    // Scoped for the same reason as the headline assertion above.
    const footer = container.querySelector("div.border-t");

    expect(footer?.textContent).toContain("avg 43.9");
    expect(footer?.textContent).toContain("min 42");
    expect(footer?.textContent).toContain("max 46");
  });

  it("embeds an accessible sparkline of the same series", () => {
    render(<KpiTrendCard {...ADP} />);
    expect(
      screen.getByRole("img", { name: "Agreed Daily Prod. — daily values" })
    ).toBeInTheDocument();
  });

  /**
   * The prototype colours every increase green and every decrease red,
   * unconditionally (`up?'#2E7D32':'#C0392B'`, app-source.txt 1884) — the
   * default here (`lowerIsBetter` unset). Flaring is the one metric where
   * that reads backwards: a *reduction* is the good outcome, so
   * `ProductionKpiSection` opts it into `lowerIsBetter`. Both directions are
   * asserted so a regression that flips only one of the two branches is
   * still caught.
   */
  it("colours an increase destructive when lowerIsBetter", () => {
    // 0.6 -> 1.2, the series' last two points, is +0.6 — flaring went up.
    render(
      <KpiTrendCard
        {...ADP}
        code="Flare"
        fullLabel="Flaring Rate"
        unit="t/d"
        values={[0, 0.6, 1.2]}
        lowerIsBetter
      />
    );

    const delta = screen.getByText("+0.6 t/d vs prev");
    expect(delta).toHaveClass("text-destructive");
    expect(delta).not.toHaveClass("text-success");
  });

  it("colours a decrease success when lowerIsBetter", () => {
    // 1.2 -> 0.6 is -0.6 — flaring went down, the good direction.
    render(
      <KpiTrendCard
        {...ADP}
        code="Flare"
        fullLabel="Flaring Rate"
        unit="t/d"
        values={[0, 1.2, 0.6]}
        lowerIsBetter
      />
    );

    const delta = screen.getByText("-0.6 t/d vs prev");
    expect(delta).toHaveClass("text-success");
    expect(delta).not.toHaveClass("text-destructive");
  });

  it("leaves the default metric's increase-is-good colouring unaffected", () => {
    render(<KpiTrendCard {...ADP} />);
    const delta = screen.getByText("+1 MM vs prev");
    expect(delta).toHaveClass("text-success");
  });
});

describe("HorizontalStackedBarChart", () => {
  const BUCKETS = [
    { name: "Overdue", tone: "chart-5" },
    { name: "Due soon", tone: "chart-3" },
  ] as const;

  const CATEGORIES = [
    { label: "Active Force", values: [2, 3] },
    { label: "SMITH Lock", values: [0, 1] },
  ];

  it("tabulates as a crosstab — a row per category, a column per bucket", () => {
    render(
      <HorizontalStackedBarChart
        label="Compliance items by category"
        buckets={BUCKETS}
        categories={CATEGORIES}
      />
    );

    expect(
      screen.getByRole("img", { name: "Compliance items by category" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Overdue" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("rowheader", { name: "Active Force" })
    ).toBeInTheDocument();
  });

  it("prints the row total with the configured suffix", () => {
    render(
      <HorizontalStackedBarChart
        label="Chart"
        buckets={BUCKETS}
        categories={CATEGORIES}
        totalSuffix="open"
      />
    );

    // The bold total and its suffix share one `<span>`; `getByText` matches
    // the inner span whose own content is exactly "5", so the suffix is
    // checked on its parent rather than with a query that would also match
    // every ancestor's aggregated text.
    const total = screen.getByText("5");
    expect(total).toBeInTheDocument();
    expect(total.parentElement?.textContent).toContain("open");
  });

  /**
   * Every row fills 100% of its own total — unlike `StackedBarChart`, whose
   * column height is proportional to a shared axis maximum.
   */
  it("fills every row's track regardless of its total", () => {
    const { container } = render(
      <HorizontalStackedBarChart
        label="Chart"
        buckets={BUCKETS}
        categories={[
          { label: "Small", values: [1, 0] },
          { label: "Big", values: [50, 0] },
        ]}
      />
    );

    // Scoped to the rows, not the whole chart: the legend swatch above it
    // carries the same tone class.
    const rows = container.querySelector("[data-slot='chart-rows']");
    const filled = [...(rows?.querySelectorAll(".bg-chart-5") ?? [])];
    expect(filled).toHaveLength(2);
    // Both rows are 100% one bucket, so both segments span the whole track —
    // this chart scales to each row's own total, not a shared maximum.
    for (const segment of filled) {
      expect(segment.className).toContain("basis-[100%]");
    }
  });

  /**
   * The structural fix: this was an `<svg viewBox="0 0 640 h">` with `w-full`,
   * which scales every dimension inside it — including type — by
   * `container_width / 640`. The prototype (`app-source.txt` 1888–1895) uses
   * `div`s with percentage widths, and so does this now.
   */
  it("draws with no scaling layer, so declared sizes are real pixels", () => {
    const { container } = render(
      <HorizontalStackedBarChart
        label="Chart"
        buckets={BUCKETS}
        categories={CATEGORIES}
      />
    );

    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelector("[data-slot='chart-rows']")).not.toBeNull();
  });

  /**
   * Rounding each share independently lets five buckets total 98% or 102%,
   * which in a 100%-stacked bar shows as the last segment overflowing the
   * rounded track or leaving a sliver of empty track behind it.
   */
  it("apportions segments that total exactly 100% of the track", () => {
    const { container } = render(
      <HorizontalStackedBarChart
        label="Chart"
        buckets={[
          { name: "A", tone: "chart-5" },
          { name: "B", tone: "chart-3" },
          { name: "C", tone: "chart-4" },
        ]}
        // Thirds — 33.33% each, which naive rounding turns into 99%.
        categories={[{ label: "Even", values: [1, 1, 1] }]}
      />
    );

    const percentages = [...container.querySelectorAll("[title]")].map(
      (segment) => Number(/basis-\[(\d+)%\]/.exec(segment.className)?.[1] ?? 0)
    );
    expect(percentages).toHaveLength(3);
    expect(percentages.reduce((sum, value) => sum + value, 0)).toBe(100);
  });

  it("carries each segment's exact count as a native tooltip", () => {
    const { container } = render(
      <HorizontalStackedBarChart
        label="Chart"
        buckets={BUCKETS}
        categories={CATEGORIES}
      />
    );

    // A `title` *attribute* now, not an SVG `<title>` child — same native
    // tooltip, on an HTML element.
    const titles = [...container.querySelectorAll("[title]")].map((segment) =>
      segment.getAttribute("title")
    );
    expect(titles).toContain("Overdue: 2");
    expect(titles).toContain("Due soon: 3");
  });

  /**
   * `iHStack`'s own geometry prints the count inside the segment, but only
   * when it clears zero (`v>=1?v:''`, app-source.txt 1892) — a segment for a
   * zero count does not draw at all (`horizontalStack` gives it width 0), so
   * there is nothing to label.
   */
  /**
   * `getByText` alone is ambiguous here: the same count also appears as a
   * cell in `ChartFrame`'s hidden accessible table, so both matches are
   * gathered and the in-segment one (an SVG `<text>` carrying `fill-on-brand`)
   * is picked out from among them.
   */
  it("prints each segment's count inside the fill, using the on-brand token", () => {
    const { container } = render(
      <HorizontalStackedBarChart
        label="Chart"
        buckets={BUCKETS}
        categories={CATEGORIES}
      />
    );

    const counts = [...container.querySelectorAll(".text-on-brand")].map(
      (node) => node.textContent
    );
    expect(counts).toContain("2");
    expect(counts).toContain("3");
  });

  it("omits the in-segment label for a zero-width segment", () => {
    const { container } = render(
      <HorizontalStackedBarChart
        label="Chart"
        buckets={BUCKETS}
        categories={[{ label: "SMITH Lock", values: [0, 1] }]}
      />
    );

    // Only the non-zero bucket's count renders inside a segment — the
    // zero-value one never draws a segment to label at all.
    const inSegmentLabels = [
      ...container.querySelectorAll(".text-on-brand"),
    ].map((node) => node.textContent);
    expect(inSegmentLabels).toEqual(["1"]);
  });

  it("still renders a track for an all-zero category, without NaN geometry", () => {
    const { container } = render(
      <HorizontalStackedBarChart
        label="Chart"
        buckets={BUCKETS}
        categories={[{ label: "Quiet", values: [0, 0] }]}
      />
    );

    for (const element of container.querySelectorAll("*")) {
      expect(element.className.toString()).not.toContain("NaN");
    }
    // The empty track still renders, so a zero row reads as a row.
    expect(container.querySelector(".bg-muted")).not.toBeNull();
    expect(container.querySelectorAll("[title]")).toHaveLength(0);
  });
});

describe("ChartKindToggle", () => {
  it("announces which kind is active rather than showing it in colour alone", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ChartKindToggle
        label="Chart type for pending actions"
        value="bar"
        onChange={onChange}
      />
    );

    expect(
      screen.getByRole("group", { name: "Chart type for pending actions" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bar" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Pie" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );

    await user.click(screen.getByRole("button", { name: "Pie" }));
    expect(onChange).toHaveBeenCalledWith("pie");
  });

  /** The prototype omits `type`, so each button would submit an enclosing form. */
  it("gives every button an explicit type", () => {
    render(
      <ChartKindToggle label="Chart type" value="bar" onChange={vi.fn()} />
    );

    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAttribute("type", "button");
    }
  });
});

describe("chart source hygiene", () => {
  /**
   * `.claude/rules/01`: no hardcoded colour in a component. The prototype passes
   * a hex per datum; this asserts none of that survived the port.
   */
  it("contains no hardcoded colour anywhere under components/charts", () => {
    const directory = join(process.cwd(), "src", "components", "charts");
    const offenders: string[] = [];

    for (const file of readdirSync(directory)) {
      if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;
      if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;

      const source = readFileSync(join(directory, file), "utf8");
      // Strip block comments: the docblocks quote the prototype's hex values on
      // purpose, and citing what was removed is not the same as shipping it.
      const code = source.replace(/\/\*[\s\S]*?\*\//g, "");

      if (/#[0-9a-fA-F]{3,8}\b/.test(code)) offenders.push(`${file} (hex)`);
      if (/\brgba?\(/.test(code)) offenders.push(`${file} (rgb)`);
      if (/\boklch\(/.test(code)) offenders.push(`${file} (oklch)`);
    }

    expect(offenders).toEqual([]);
  });

  /**
   * `.claude/rules/01`: mobile-first, "never a fixed `w-[400px]`". jsdom cannot
   * measure layout, so this is the structural proxy — a chart with no pixel
   * width and a `viewBox` is fluid by construction at 375 / 768 / 1440, and a
   * pixel width is the one thing that would break that silently.
   */
  it("declares no fixed pixel width or height", () => {
    const directory = join(process.cwd(), "src", "components", "charts");
    const offenders: string[] = [];

    for (const file of readdirSync(directory)) {
      if (!file.endsWith(".tsx") || file.endsWith(".test.tsx")) continue;

      const code = readFileSync(join(directory, file), "utf8").replace(
        /\/\*[\s\S]*?\*\//g,
        ""
      );

      // `w-[8.75rem]` is fine — rem scales with the user's text size.
      // `w-[140px]` is not.
      if (/\b[wh]-\[\d+(\.\d+)?px\]/.test(code)) {
        offenders.push(`${file} (pixel width/height utility)`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
