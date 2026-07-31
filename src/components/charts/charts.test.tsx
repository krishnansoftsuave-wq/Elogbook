import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ChartFrame } from "@/components/charts/ChartFrame";
import { ChartKindToggle } from "@/components/charts/ChartKindToggle";
import { PieChart } from "@/components/charts/PieChart";
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

  it("renders one rect per non-zero segment", () => {
    const { container } = render(
      <StackedBarChart
        label="Chart"
        buckets={BUCKETS}
        categories={[{ label: "B-train", values: [2, 0] }]}
      />
    );

    expect(container.querySelectorAll("rect")).toHaveLength(1);
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

    for (const element of container.querySelectorAll("rect, text")) {
      for (const attribute of ["x", "y", "width", "height"]) {
        const value = element.getAttribute(attribute);
        if (value !== null) expect(value).not.toContain("NaN");
      }
    }
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
