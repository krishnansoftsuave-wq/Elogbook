import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductionKpiSection } from "@/features/trends/components/ProductionKpiSection";
import type { ProductionKpi } from "@/features/trends/schemas";

const KPIS: ProductionKpi[] = [
  {
    code: "ADP",
    label: "Agreed Daily Prod.",
    unit: "MM",
    values: [42, 44],
    tone: "series-1",
  },
  {
    code: "Spot",
    label: "Spot Rate",
    unit: "MM",
    values: [37, 39],
    tone: "series-2",
  },
  {
    code: "AVG",
    label: "Average Rate",
    unit: "MM",
    values: [50, 51.2],
    tone: "series-3",
  },
  {
    code: "TLP",
    label: "Line Pressure",
    unit: "Bar",
    values: [71.6, 72],
    tone: "series-4",
  },
  {
    code: "Flare",
    label: "Flaring Rate",
    unit: "t/d",
    values: [0, 0.6],
    tone: "series-5",
  },
];

describe("ProductionKpiSection", () => {
  it("renders one KpiTrendCard per production KPI", () => {
    render(<ProductionKpiSection productionKpis={KPIS} />);

    for (const kpi of KPIS) {
      expect(screen.getByText(kpi.code)).toBeInTheDocument();
      expect(screen.getByText(kpi.label)).toBeInTheDocument();
    }
  });

  /**
   * The tone-mapping table is the one piece of logic here, and it is
   * deliberately NOT a `series-N` → `chart-N` ordinal map: the prototype
   * names an exact colour per metric (ADP teal, Spot blue, AVG green, TLP
   * purple, Flare amber — `prod`, app-source.txt 1909-1914), and an ordinal
   * map put ADP and Spot both in the teal family while never reaching the
   * blue/purple tones `globals.css` derived specifically for them. This pins
   * the corrected mapping so it cannot regress back to the ordinal one.
   */
  it("maps each KpiSeriesTone to its metric's own colour, not the ordinal chart tone", () => {
    const { container } = render(
      <ProductionKpiSection productionKpis={KPIS} />
    );

    const expected = [
      "bg-chart-1", // ADP — teal
      "bg-chart-6", // Spot — blue
      "bg-chart-4", // AVG — green
      "bg-chart-7", // TLP — purple
      "bg-chart-3", // Flare — amber
    ];

    const swatches = [
      ...container.querySelectorAll("[aria-hidden].rounded-sm"),
    ];
    expect(swatches).toHaveLength(5);
    expected.forEach((className, index) => {
      expect(swatches[index]).toHaveClass(className);
    });
  });

  it("renders nothing but the grid when there are no KPIs", () => {
    render(<ProductionKpiSection productionKpis={[]} />);
    expect(screen.queryByText("ADP")).not.toBeInTheDocument();
  });
});
