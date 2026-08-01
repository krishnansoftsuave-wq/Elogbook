import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PeriodPills } from "@/features/trends/components/PeriodPills";

describe("PeriodPills", () => {
  it("announces the active period via aria-pressed, not colour alone", () => {
    render(<PeriodPills value="7d" onChange={vi.fn()} />);

    expect(
      screen.getByRole("group", { name: "Trend period" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "7 days" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "14 days" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.getByRole("button", { name: "30 days" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("calls onChange with the clicked period", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<PeriodPills value="7d" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "30 days" }));
    expect(onChange).toHaveBeenCalledWith("30d");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("gives every pill an explicit button type", () => {
    render(<PeriodPills value="14d" onChange={vi.fn()} />);
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAttribute("type", "button");
    }
  });

  /**
   * The `isFetching` convention every other filtered list in this repo
   * applies to its own in-flight control (`ActionsTable`, `EntriesTable`,
   * `UsersTable`, `SummariesTable`, `AuditTable`) — a click can't queue a
   * second request behind one still resolving.
   */
  it("disables every pill while a fetch is in flight", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<PeriodPills value="7d" onChange={onChange} disabled />);

    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
    }

    await user.click(screen.getByRole("button", { name: "30 days" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("leaves the pills enabled by default", () => {
    render(<PeriodPills value="7d" onChange={vi.fn()} />);
    for (const button of screen.getAllByRole("button")) {
      expect(button).not.toBeDisabled();
    }
  });
});
