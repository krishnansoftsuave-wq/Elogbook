import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OletCard } from "@/features/trends/components/OletCard";

describe("OletCard", () => {
  it("says 'none this shift' for a zero count", () => {
    render(<OletCard olet={{ count: 0 }} />);
    expect(screen.getByText("none this shift")).toBeInTheDocument();
  });

  it("counts a non-zero value instead of the static zero copy", () => {
    render(<OletCard olet={{ count: 4 }} />);
    expect(screen.getByText("4 this shift")).toBeInTheDocument();
    expect(screen.queryByText("none this shift")).not.toBeInTheDocument();
  });

  it("names the pending-definition caveat and its requirement ID", () => {
    render(<OletCard olet={{ count: 0 }} />);
    expect(screen.getByText(/FR-AN-06/)).toBeInTheDocument();
  });

  /** `trendTile` (`app-source.txt` 1896) places the icon first, at 17px —
   * this tile stayed on `StatTile`'s icon-right, 20px default until now. */
  it("sizes the tile icon at 17px, not the default 20px", () => {
    render(<OletCard olet={{ count: 0 }} />);
    const card = screen
      .getByText("OLET items", { selector: "p" })
      .closest('[data-slot="card-content"]');
    const icon = (card as HTMLElement).querySelector("[aria-hidden]");

    expect(icon).toHaveClass("size-4.25");
    expect(icon).not.toHaveClass("size-5");
    expect([...(card?.children ?? [])].indexOf(icon as Element)).toBe(0);
  });
});
