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
});
