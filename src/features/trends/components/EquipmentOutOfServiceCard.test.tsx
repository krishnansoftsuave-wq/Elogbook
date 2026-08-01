import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EquipmentOutOfServiceCard } from "@/features/trends/components/EquipmentOutOfServiceCard";
import type { EquipmentOutOfService } from "@/features/trends/schemas";
import { formatPlantTimestamp } from "@/lib/datetime";

/**
 * ISO instants, not pre-formatted strings — matching what `mocks/data/trends.ts`
 * actually sends (`daysFromBase`, the same instant shape `ShipArrival.eta`
 * uses). The component formats them with `formatPlantTimestamp`; the raw ISO
 * string reaching the DOM unformatted was the defect this fixture pins.
 */
const RETURN_AT = "2026-07-18T06:00:00+04:00";

const ROWS: EquipmentOutOfService[] = [
  {
    tag: "2P-1401A",
    area: "Train 2",
    outSince: "2026-06-03T06:00:00+04:00",
    expectedReturnKind: "scheduled",
    expectedReturnAt: RETURN_AT,
  },
  {
    tag: "2E-1104C",
    area: "Train 2",
    outSince: "2026-06-05T06:00:00+04:00",
    expectedReturnKind: "to_be_confirmed",
    expectedReturnAt: null,
  },
  {
    tag: "2E-1313A",
    area: "Train 2",
    outSince: "2026-06-06T06:00:00+04:00",
    expectedReturnKind: "next_shutdown",
    expectedReturnAt: null,
  },
];

const BY_AREA = [{ area: "Train 2", count: 3 }];

const tileValue = (label: string): string | null => {
  const card = screen
    .getByText(label, { selector: "p" })
    .closest('[data-slot="card"]');
  if (!card) throw new Error(`No card found for tile "${label}"`);
  return within(card as HTMLElement).getByText(/^\d+$/).textContent;
};

describe("EquipmentOutOfServiceCard", () => {
  it("derives the three tiles from the row list", () => {
    render(
      <EquipmentOutOfServiceCard
        equipmentOutOfService={ROWS}
        equipmentOutOfServiceByArea={BY_AREA}
      />
    );

    expect(tileValue("Total out of service")).toBe("3");
    expect(tileValue("No return date")).toBe("1");
    expect(tileValue("Needs shutdown")).toBe("1");
  });

  it("shows the specific tag in the needs-shutdown tile's hint", () => {
    render(
      <EquipmentOutOfServiceCard
        equipmentOutOfService={ROWS}
        equipmentOutOfServiceByArea={BY_AREA}
      />
    );
    // Scoped to the tile's hint paragraph: the same tag also appears as a
    // table cell, so an unscoped query would be ambiguous.
    const card = screen
      .getByText("Needs shutdown", { selector: "p" })
      .closest('[data-slot="card"]');
    expect(
      within(card as HTMLElement).getByText("2E-1313A")
    ).toBeInTheDocument();
  });

  it("renders each expected-return kind with its own text", () => {
    render(
      <EquipmentOutOfServiceCard
        equipmentOutOfService={ROWS}
        equipmentOutOfServiceByArea={BY_AREA}
      />
    );

    // Two tables render: the "by area" chart's own accessible table, and this
    // card's equipment list — named to disambiguate.
    const table = screen.getByRole("table", {
      name: "Equipment currently out of service, with tag, area, out-since date and expected return",
    });
    expect(
      within(table).getByText(formatPlantTimestamp(RETURN_AT))
    ).toBeInTheDocument();
    expect(within(table).getByText("TBC")).toBeInTheDocument();
    expect(within(table).getByText("Next shutdown")).toBeInTheDocument();
  });

  it("formats out-since as plant time rather than the raw ISO instant", () => {
    render(
      <EquipmentOutOfServiceCard
        equipmentOutOfService={ROWS}
        equipmentOutOfServiceByArea={BY_AREA}
      />
    );

    const table = screen.getByRole("table", {
      name: "Equipment currently out of service, with tag, area, out-since date and expected return",
    });
    expect(
      within(table).getByText(formatPlantTimestamp(ROWS[0]!.outSince))
    ).toBeInTheDocument();
    expect(
      within(table).queryByText(ROWS[0]!.outSince)
    ).not.toBeInTheDocument();
  });

  it("renders an empty state instead of a table when nothing is out of service", () => {
    render(
      <EquipmentOutOfServiceCard
        equipmentOutOfService={[]}
        equipmentOutOfServiceByArea={[]}
      />
    );

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("No equipment out of service")).toBeInTheDocument();
  });

  /**
   * The prototype's `oosByArea` (`app-source.txt` 1930) hardcodes one hex per
   * named area. Train 3 and Storage share `chart-7` deliberately — both
   * prototype hexes are distinct purples this build's ramp collapses to one
   * slot — so this pins the lookup table exactly rather than merely "each
   * area gets a colour".
   */
  it("colours each area by the prototype's own per-area table", () => {
    render(
      <EquipmentOutOfServiceCard
        equipmentOutOfService={[]}
        equipmentOutOfServiceByArea={[
          { area: "Train 2", count: 3 },
          { area: "Train 3", count: 1 },
          { area: "Common Fac.", count: 2 },
          { area: "Storage", count: 4 },
        ]}
      />
    );

    // Scoped to the chart's own `role="img"` region — an unscoped query also
    // picks up the tile icons above it, throwing off a positional assertion.
    const chart = screen.getByRole("img", {
      name: "Equipment out of service by area",
    });
    const segments = [...chart.querySelectorAll("[title]")];
    expect(segments[0]).toHaveClass("bg-chart-6");
    expect(segments[1]).toHaveClass("bg-chart-7");
    expect(segments[2]).toHaveClass("bg-chart-1");
    expect(segments[3]).toHaveClass("bg-chart-7");
  });
});
