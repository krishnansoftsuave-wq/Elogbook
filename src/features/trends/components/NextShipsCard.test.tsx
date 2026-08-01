import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NextShipsCard } from "@/features/trends/components/NextShipsCard";
import type { ShipArrival } from "@/features/trends/schemas";

const SHIPS: ShipArrival[] = [
  { vessel: "Myrina LNG", eta: "2026-06-26T02:00:00Z", status: "scheduled" },
  { vessel: "Flex Ranger", eta: "2026-07-02T14:00:00Z", status: "provisional" },
];

describe("NextShipsCard", () => {
  it("shows the first ship as the headline arrival", () => {
    render(<NextShipsCard nextShips={SHIPS} />);
    expect(screen.getByText("Next arrival")).toBeInTheDocument();
    // Scoped to the StatTile's own value paragraph — the vessel name is
    // repeated in the list below, so an unscoped query is ambiguous.
    expect(
      screen.getByText("Myrina LNG", { selector: "p" })
    ).toBeInTheDocument();
  });

  it("labels each ship's status as text, not colour alone", () => {
    render(<NextShipsCard nextShips={SHIPS} />);
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
    expect(screen.getByText("Provisional")).toBeInTheDocument();
  });

  it("renders an empty state when nothing is scheduled", () => {
    render(<NextShipsCard nextShips={[]} />);
    expect(screen.getByText("No ships scheduled")).toBeInTheDocument();
    expect(screen.queryByText("Next arrival")).not.toBeInTheDocument();
  });
});
