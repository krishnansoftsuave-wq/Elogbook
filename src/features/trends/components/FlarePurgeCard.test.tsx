import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FlarePurgeCard } from "@/features/trends/components/FlarePurgeCard";
import type { FlarePurgeArea } from "@/features/trends/schemas";
import { formatPlantTimestamp } from "@/lib/datetime";

describe("FlarePurgeCard", () => {
  it("resolves the purge medium code to its display label", () => {
    const since = "2026-06-03T06:00:00+04:00";
    const areas: FlarePurgeArea[] = [
      { area: "Flare Area 1", medium: "fuel_gas", since },
      {
        area: "Flare Area 2",
        medium: "nitrogen",
        since: "2026-06-01T06:00:00+04:00",
      },
    ];

    render(<FlarePurgeCard flarePurgeAreas={areas} />);

    expect(screen.getByText("Flare Area 1")).toBeInTheDocument();
    expect(screen.getAllByText("Fuel Gas").length).toBeGreaterThan(0);
    expect(screen.getAllByText("N₂").length).toBeGreaterThan(0);
    // Plant time, not the raw ISO instant — that was the defect this pins.
    expect(
      screen.getByText(`Fuel Gas · since ${formatPlantTimestamp(since)}`)
    ).toBeInTheDocument();
    expect(screen.queryByText(since, { exact: false })).not.toBeInTheDocument();
  });

  it("renders an empty state when no areas are reported", () => {
    render(<FlarePurgeCard flarePurgeAreas={[]} />);
    expect(screen.getByText("No flare purge data")).toBeInTheDocument();
  });
});
