import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ChartFrame } from "@/components/charts/ChartFrame";
import { ChartKindToggle } from "@/components/charts/ChartKindToggle";
import { HorizontalStackedBarChart } from "@/components/charts/HorizontalStackedBarChart";
import { KpiTrendCard } from "@/components/charts/KpiTrendCard";
import { LineChart } from "@/components/charts/LineChart";
import { PieChart } from "@/components/charts/PieChart";
import { Sparkline } from "@/components/charts/Sparkline";
import { StackedBarChart } from "@/components/charts/StackedBarChart";
import { CHART_TONES, SCALE_TONES } from "@/components/charts/tones";

/**
 * The contract every chart primitive owes.
 *
 * `SCREENS.md` records the prototype's gap plainly — *"Charts have no
 * accessible equivalent — SVG with no labels or table fallback"* — and
 * `.claude/rules/03` sets the bar at WCAG 2.1 AA.
 *
 * **These assertions did not change when the charts moved to Recharts**, and
 * that is the point of them. A chart library draws shapes; it does not publish
 * the numbers behind them. Everything below is about the guarantee rather than
 * the renderer, so it held across a complete change of implementation — which
 * is exactly what a test of a contract should do.
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
        series={[{ name: "Actions", data: [{ label: "Open", value: 6 }] }]}
      >
        <svg />
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
        <svg />
      </ChartFrame>
    );

    const table = screen.getByRole("table", {
      name: "Pending actions by status",
    });
    expect(
      within(table).getByRole("columnheader", { name: "Status" })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("rowheader", { name: "Open" })
    ).toBeInTheDocument();
    expect(within(table).getByText("6")).toBeInTheDocument();
  });

  it("keeps the table in the accessibility tree while hiding it visually", () => {
    render(
      <ChartFrame
        label="Chart"
        series={[{ name: "A", data: [{ label: "x", value: 1 }] }]}
      >
        <svg />
      </ChartFrame>
    );

    const table = screen.getByRole("table", { name: "Chart" });
    expect(table.closest(".sr-only")).not.toBeNull();
    expect(table).not.toHaveAttribute("hidden");
    expect(table).not.toHaveAttribute("aria-hidden");
  });

  /**
   * The regression that produced the wrapper: at 1440 the fallback table laid
   * out at its natural width and gave the page 96px of horizontal scroll.
   * `.claude/rules/01` allows none at any breakpoint.
   */
  it("does not let the fallback table size the layout", () => {
    const { container } = render(
      <ChartFrame
        label="Chart"
        series={[
          {
            name: "A very long series name that would widen a table",
            data: [{ label: "An unusually long category label", value: 1 }],
          },
        ]}
      >
        <svg />
      </ChartFrame>
    );

    /*
      ⚠️ The mechanism changed, the claim did not. This used to require a
      wrapping `<div class="sr-only">`, because `sr-only`'s 1px width is a
      *minimum* for a table and the untamed table gave the page 96px of
      horizontal scroll at 1440. `ChartDataTable` now solves it on the table
      itself with `table-fixed`, which makes the 1px bind for real — a better
      fix, and one that survives the table being rendered outside `ChartFrame`
      by the two HTML charts that reuse it.
    */
    const clipped = container.querySelector(".sr-only");
    expect(clipped?.tagName.toLowerCase()).toBe("table");
    expect(clipped).toHaveClass("table-fixed");
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
        series={[
          { name: "A", data: [{ label: "x", value: 1 }] },
          { name: "B", data: [{ label: "y", value: 2 }] },
        ]}
      >
        <svg />
      </ChartFrame>
    );

    expect(screen.getAllByText("—")).toHaveLength(2);
  });
});

describe("PieChart", () => {
  it("labels the chart and tabulates every slice with its share", () => {
    render(
      <PieChart
        label="Pending actions by status"
        categoryHeader="Status"
        data={PIE_DATA}
      />
    );

    expect(
      screen.getByRole("img", { name: "Pending actions by status" })
    ).toBeInTheDocument();

    const table = screen.getByRole("table", {
      name: "Pending actions by status",
    });
    expect(within(table).getByText("6 (60%)")).toBeInTheDocument();
    expect(within(table).getByText("3 (30%)")).toBeInTheDocument();
  });

  it("defaults the centre readout to the total", () => {
    render(<PieChart label="Chart" data={PIE_DATA} />);
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  /** "No data" and "chart failed to render" must not look identical. */
  it("still labels an all-zero series rather than rendering nothing", () => {
    render(
      <PieChart
        label="Chart"
        data={[
          { label: "Open", value: 0, tone: "chart-1" },
          { label: "Closed", value: 0, tone: "chart-2" },
        ]}
      />
    );

    expect(screen.getByRole("img", { name: "Chart" })).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Chart" });
    expect(within(table).getAllByText("0 (0%)")).toHaveLength(2);
  });

  it("hides the centre readout from assistive technology", () => {
    const { container } = render(<PieChart label="Chart" data={PIE_DATA} />);
    expect(container.querySelector("[aria-hidden]")).not.toBeNull();
  });

  /**
   * The prototype's highlight (`iPie` hover state): the centre readout swaps
   * from the total to the hovered slice. It is why this donut has no floating
   * tooltip — the middle of the chart is already a place to put the number.
   */
  it("swaps the centre readout to the slice under the pointer", async () => {
    const { container } = render(
      <PieChart label="Chart" data={PIE_DATA} centerLabel="items by status" />
    );

    /*
      Scoped to the centre, not the whole card: the slice's name is deliberately
      in two places once it is highlighted — the legend row and the readout —
      so an unscoped `getByText` finds both and fails on the ambiguity that the
      feature creates.
    */
    const centre = container.querySelector('[data-slot="chart-center"]');
    expect(centre).toHaveTextContent("10");
    expect(centre).toHaveTextContent("items by status");

    await userEvent.hover(screen.getByRole("button", { name: /In Progress/ }));

    expect(centre).toHaveTextContent("3");
    expect(centre).toHaveTextContent("In Progress");
    expect(centre).not.toHaveTextContent("items by status");
  });

  /**
   * The prototype highlights on `mouseenter` only, so a keyboard user never
   * sees it. Each legend row is a real button here, so focus does the same.
   */
  it("gives the highlight a keyboard path", () => {
    const { container } = render(
      <PieChart label="Chart" data={PIE_DATA} centerLabel="items in total" />
    );
    const centre = container.querySelector('[data-slot="chart-center"]');

    const row = screen.getByRole("button", { name: /On Hold/ });
    expect(row).toHaveAttribute("type", "button");

    /*
      `focusIn`, not `focus`. React attaches `onFocus` to the bubbling `focusin`
      event, so a dispatched `focus` never reaches the handler and the assertion
      reads the pre-focus render. `row.focus()` first, so `toHaveFocus` is
      asserting real DOM focus rather than the synthetic event.
    */
    row.focus();
    fireEvent.focusIn(row);

    expect(row).toHaveFocus();
    expect(centre).toHaveTextContent("On Hold");
    expect(centre).not.toHaveTextContent("items in total");
  });
});

describe("StackedBarChart", () => {
  const BUCKETS = [
    { name: "Overdue", tone: "chart-5" as const },
    { name: "Due soon", tone: "chart-3" as const },
  ];
  const CATEGORIES = [
    { label: "B-train", values: [2, 3] },
    { label: "Unit 3", values: [0, 1] },
  ];

  it("tabulates as a crosstab — a row per category, a column per bucket", () => {
    render(
      <StackedBarChart
        label="Open items by area and due date"
        categoryHeader="Area"
        buckets={BUCKETS}
        categories={CATEGORIES}
      />
    );

    const table = screen.getByRole("table", {
      name: "Open items by area and due date",
    });
    expect(
      within(table).getByRole("columnheader", { name: "Overdue" })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: "Due soon" })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("rowheader", { name: "B-train" })
    ).toBeInTheDocument();
  });

  /**
   * A category short of values must not shift the stack — the defect the
   * normalisation in `valueAt` exists to prevent.
   */
  it("treats a missing value as zero", () => {
    render(
      <StackedBarChart
        label="Chart"
        buckets={BUCKETS}
        categories={[{ label: "B-train", values: [2] }]}
      />
    );

    const table = screen.getByRole("table", { name: "Chart" });
    const row = within(table).getByRole("row", { name: /B-train/ });
    expect(within(row).getByText("0")).toBeInTheDocument();
  });

  /** Recharts' bar `onClick` is mouse-only; this is the reachable path. */
  it("exposes the drill-down as keyboard-reachable buttons", async () => {
    const onSelect = vi.fn();
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

    await userEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ label: "B-train" })
    );
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

  it("survives an all-zero column", () => {
    render(
      <StackedBarChart
        label="Chart"
        buckets={BUCKETS}
        categories={[{ label: "Quiet", values: [0, 0] }]}
      />
    );

    const table = screen.getByRole("table", { name: "Chart" });
    expect(within(table).getAllByText("0")).toHaveLength(2);
  });

  /**
   * The defect this pins shipped twice, and both times it looked like a chart
   * that had simply lost some numbers.
   *
   * Recharts draws no rectangle for a zero-value segment and renumbers the ones
   * that survive. So a `LabelList` on the topmost *bucket* loses the total of
   * every column whose top bucket is 0, and deciding the bearer from the index
   * Recharts hands the label picks out the wrong column instead. On the safety
   * chart three of seven columns went unlabelled, 18 and 21 among them.
   *
   * Asserted inside `role="img"`, not on the page: the accessible table repeats
   * these figures as cell values, and scoping to the drawing is what stops a
   * table cell standing in for a total that was never drawn.
   */
  it("prints one total per column, including where the top bucket is empty", () => {
    render(
      <StackedBarChart
        label="Chart"
        buckets={BUCKETS}
        categories={[
          { label: "B-train", values: [2, 3] },
          { label: "Unit 3", values: [7, 0] },
        ]}
      />
    );

    const drawing = screen.getByRole("img", { name: "Chart" });

    /*
      Exactly one, not merely present. Every bar carries a `LabelList`, so a
      bearer test that let more than one bar through would stack two identical
      totals on this column — both of its buckets are drawn.
    */
    expect(within(drawing).getAllByText("5")).toHaveLength(1);
    // The regression: bucket 1 is 0 here, so the bearer must fall to bucket 0.
    expect(within(drawing).getAllByText("7")).toHaveLength(1);
  });
});

describe("LineChart", () => {
  const X = ["Mon", "Tue", "Wed"];
  const SERIES = [
    { name: "Entries", tone: "chart-1" as const, points: [4, 9, 6] },
  ];

  it("exposes the drawing as one labelled image", () => {
    render(
      <LineChart label="Entries over the week" xLabels={X} series={SERIES} />
    );
    expect(
      screen.getByRole("img", { name: "Entries over the week" })
    ).toBeInTheDocument();
  });

  it("publishes every point in the accessible table", () => {
    render(
      <LineChart
        label="Entries over the week"
        xLabels={X}
        series={SERIES}
        categoryHeader="Day"
      />
    );

    const table = screen.getByRole("table", { name: "Entries over the week" });
    for (const day of X) {
      expect(
        within(table).getByRole("rowheader", { name: day })
      ).toBeInTheDocument();
    }
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

    /*
      Scoped to the drawn label, not the accessible table's own "3" cell. The
      label is an SVG `<text>` now rather than a `<span>` in a flexbox column,
      so the query moved with the implementation; the claim — a bare number
      unless a unit was asked for — is unchanged.
    */
    const drawn = [...container.querySelectorAll("svg text")].map((node) =>
      node.textContent?.trim()
    );
    expect(drawn).toContain("3");
    expect(screen.queryByText("3 items")).not.toBeInTheDocument();
  });

  /**
   * The `<ul>` legend is what `showLegend` controls — the accessible table's
   * own column header still names the bucket regardless, since that table
   * must carry full information independent of what the sighted legend
   * shows.
   */
  it("hides the legend when showLegend is false", () => {
    // Local, because this `StackedBarChart` case sits outside that describe's
    // shared fixture.
    const categories = [
      { label: "B-train", values: [2] },
      { label: "Unit 3", values: [1] },
    ];

    const { container } = render(
      <StackedBarChart
        label="Chart"
        buckets={[{ name: "Out of service", tone: "chart-1" }]}
        categories={categories}
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

    /*
      Recharts paints the rectangle's `fill` rather than putting a Tailwind
      background class on a `<div>`, so the override is read off the fill. Same
      claim: each category draws in its own tone, not the bucket's `chart-1`.
    */
    const fills = [
      ...container.querySelectorAll(".recharts-bar-rectangle path"),
    ]
      .map((node) => node.getAttribute("fill"))
      .filter(Boolean);

    expect(fills).toContain("var(--chart-6)");
    expect(fills).toContain("var(--chart-7)");
    expect(fills).not.toContain("var(--color-s0)");
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

    /*
      Read off the drawn geometry rather than a Tailwind height class: Recharts
      sizes each rectangle in the SVG, so `h-27`/`h-5` no longer exist. The
      claim is the one that matters either way — 10 draws visibly taller than 2.
    */
    /*
      The `M x,y` that opens each rectangle's path is its top-left corner. Both
      columns share a baseline, so the taller one starts higher — a smaller `y`.
      Read from the path rather than a Tailwind `h-N` class, which the flexbox
      version used and Recharts does not emit.
    */
    const tops = [
      ...container.querySelectorAll(".recharts-bar-rectangle path"),
    ].map((node) => {
      const start = /^M\s*(-?[\d.]+)[, ]\s*(-?[\d.]+)/.exec(
        node.getAttribute("d") ?? ""
      );
      return Number(start?.[2]);
    });

    expect(tops).toHaveLength(2);
    expect(tops[0]).toBeLessThan(tops[1] ?? 0);
  });

  /**
   * The claim the flexbox version pinned through `h-full`/`basis-[…]` classes:
   * **each column's value label sits above that column's own bar**, not at one
   * shared height. Recharts positions the label from the rendered rectangle
   * (`TotalLabel` takes `y` from the bar), so the assertion is now the thing
   * itself — two different column heights must produce two different label
   * heights.
   */
  it("puts each column's label above its own bar, not at a shared height", () => {
    const { container } = render(
      <StackedBarChart
        label="Chart"
        buckets={[{ name: "Out of service", tone: "chart-1" }]}
        categories={[
          { label: "Tall", values: [10] },
          { label: "Short", values: [2] },
        ]}
      />
    );

    const labelYs = [...container.querySelectorAll("svg text")]
      .filter((node) => ["10", "2"].includes(node.textContent?.trim() ?? ""))
      .map((node) => Number(node.getAttribute("y")));

    expect(labelYs).toHaveLength(2);
    // Lower `y` is higher on screen: the taller column's label sits above.
    expect(labelYs[0]).toBeLessThan(labelYs[1] ?? 0);
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

  // Recharts draws each bar as a `<path>`, not a `<rect>`.
  it("draws one bar per value", () => {
    const { container } = render(
      <Sparkline label="Chart" values={VALUES} tone="chart-1" />
    );
    // One rectangle group per reading. Recharts wraps each bar in its own
    // `recharts-bar-rectangle` layer, which is the countable unit here — the
    // flexbox version counted `<rect>` elements that no longer exist.
    expect(container.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(
      VALUES.length
    );
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

  it("appends the unit to each printed value", () => {
    render(
      <LineChart
        label="Response time"
        xLabels={["T-1"]}
        series={[{ name: "API", tone: "chart-2", points: [120] }]}
        unit="ms"
      />
    );

    expect(screen.getByText("120 ms")).toBeInTheDocument();
  });

  /**
   * ⚠️ **This assertion was inverted, deliberately.** It previously required a
   * series shorter than the axis to read as `0` — "treats a series shorter than
   * the axis as zero, not as a gap in the table" — which pinned a real defect
   * rather than a decision.
   *
   * Nothing enforces that a series has one point per label:
   * `plantOperationsWireSchema` declares `production_days` and `points` as
   * independent arrays. So a Flare series with five of seven days drew a plunge
   * to zero across the weekend and announced "0 t/d". A flare rate of zero is an
   * operational event and must not be indistinguishable from a reading nobody
   * took — which is exactly what `connectNulls={false}` and `LineChart`'s own
   * "a gap in a series is a gap" docblock already promised.
   */
  it("shows a missing point as a gap, not as zero", () => {
    // Local, because this `LineChart` case sits outside that describe's fixture.
    const xLabels = ["Mon", "Tue", "Wed"];

    render(
      <LineChart
        label="Chart"
        xLabels={xLabels}
        series={[{ name: "Entries", tone: "chart-1", points: [4] }]}
      />
    );

    const table = screen.getByRole("table", { name: "Chart" });
    expect(within(table).queryByText("0")).not.toBeInTheDocument();
    // One em dash per label the series has no reading for.
    expect(within(table).getAllByText("—")).toHaveLength(xLabels.length - 1);
  });
});

describe("Sparkline", () => {
  const VALUES = [3, 5, 4, 8];

  it("carries the trend in an accessible table, not sighted-only", () => {
    render(
      <Sparkline label="Active users over the last hour" values={VALUES} />
    );

    const table = screen.getByRole("table", {
      name: "Active users over the last hour",
    });
    expect(
      within(table).getByRole("rowheader", { name: "Reading 1" })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("rowheader", { name: "Reading 4" })
    ).toBeInTheDocument();
  });

  it("uses supplied point labels when given", () => {
    render(
      <Sparkline
        label="Active users over the last hour"
        values={[1, 2]}
        pointLabels={["12:00", "12:15"]}
      />
    );

    const table = screen.getByRole("table");
    expect(
      within(table).getByRole("rowheader", { name: "12:00" })
    ).toBeInTheDocument();
  });
});

describe("ChartKindToggle", () => {
  it("announces which kind is active rather than showing it in colour alone", async () => {
    const onChange = vi.fn();
    render(
      <ChartKindToggle label="Chart type" value="bar" onChange={onChange} />
    );

    expect(screen.getByRole("button", { name: "Bar" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Pie" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );

    await userEvent.click(screen.getByRole("button", { name: "Pie" }));
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
   * `.claude/rules/01`: no hardcoded colour in a component.
   *
   * **This is the assertion that made the Recharts port safe.** A chart library
   * wants colour as a *string*, which is the usual route back to hex literals;
   * tones resolve to `var(--chart-*)` instead, so light and dark still live in
   * `globals.css` and no component names a colour.
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
   * `.claude/rules/01`: mobile-first, "never a fixed `w-[400px]`". Recharts
   * measures its container, so a pixel width here would defeat that too.
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

  /**
   * Every tone must be backed by a real token, in both themes.
   *
   * The failure this catches is silent by construction. `FILL_BY_TONE` hands out
   * `fill-chart-8`; if `--chart-8` or its `@theme` mapping is missing, that is
   * not an error anywhere — it is an unresolved custom property, so the series
   * renders **unpainted** and the chart merely looks wrong. Nothing in the type
   * system can see it: `ChartTone` constrains the map keys, and the CSS is a
   * separate file that TypeScript never reads.
   *
   * Adding a tone therefore takes four edits — `SCALE_TONES`, the light block,
   * the dark block, and the `@theme` mapping — and this is what refuses the
   * commit that does three of them. A docblock asking for all four is what this
   * replaced; that request was already stale once.
   */
  it("backs every chart tone with a token in both themes", () => {
    const css = readFileSync(
      join(process.cwd(), "src", "app", "globals.css"),
      "utf8"
    );

    /*
      Split at the `.dark {` block so "defined twice" cannot be satisfied by one
      block listing a tone twice. Anything before it is the light theme (`:root`
      plus `@theme`); anything after is the dark override.

      `.dark {` rather than `.dark`: the first `.dark` in the file belongs to
      `@custom-variant dark (&:is(.dark *))` on line 5, which put the split above
      every declaration in the file and reported all nine tones missing from both
      themes — a test failing for a reason that has nothing to do with the tokens.
    */
    const darkAt = css.indexOf(".dark {");
    expect(darkAt).toBeGreaterThan(-1);
    const light = css.slice(0, darkAt);
    const dark = css.slice(darkAt);

    const missing: string[] = [];
    for (const tone of [...CHART_TONES, ...SCALE_TONES]) {
      const variable = `--${tone}:`;
      if (!light.includes(variable)) missing.push(`${tone} (light)`);
      if (!dark.includes(variable)) missing.push(`${tone} (dark)`);
      // Without this, the Tailwind utility never generates.
      if (!light.includes(`--color-${tone}:`)) {
        missing.push(`${tone} (@theme mapping)`);
      }
    }

    expect(missing).toEqual([]);
  });
});
