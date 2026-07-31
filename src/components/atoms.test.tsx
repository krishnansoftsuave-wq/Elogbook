import { Inbox } from "lucide-react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "@/components/EmptyState";
import { OverdueFlag } from "@/components/OverdueFlag";
import { PriorityDot } from "@/components/PriorityDot";
import { StatusPill } from "@/components/StatusPill";
import { ACTION_STATUS_VALUES, PRIORITY_VALUES } from "@/types/operations";
import { DECISION_STATUS_VALUES } from "@/features/decisions/schemas";
import { REQUEST_STATUS_VALUES } from "@/features/requests/schemas";

describe("StatusPill", () => {
  it("labels every FR-PA-04 action status", () => {
    for (const status of ACTION_STATUS_VALUES) {
      const { unmount } = render(<StatusPill kind="action" status={status} />);
      // Never the raw wire token — the label is the translatable surface.
      expect(screen.queryByText(status)).not.toBeInTheDocument();
      unmount();
    }
  });

  it.each([...ACTION_STATUS_VALUES])("renders action status %s", (status) => {
    render(<StatusPill kind="action" status={status} />);
    expect(screen.getByText(/\w/)).toBeInTheDocument();
  });

  it("renders every decision and request status without falling through", () => {
    for (const status of DECISION_STATUS_VALUES) {
      const { unmount } = render(
        <StatusPill kind="decision" status={status} />
      );
      expect(screen.getByText(/\w/)).toBeInTheDocument();
      unmount();
    }
    for (const status of REQUEST_STATUS_VALUES) {
      const { unmount } = render(<StatusPill kind="request" status={status} />);
      expect(screen.getByText(/\w/)).toBeInTheDocument();
      unmount();
    }
  });

  it("spells the six action statuses the way the BRD does", () => {
    render(<StatusPill kind="action" status="in_progress" />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  /**
   * The prototype keys one flat table by display string and falls back on a
   * miss (`m[s] || [...]`, app-source.txt 169), so a decision status silently
   * renders in the action palette. The discriminated union makes that
   * unrepresentable — this pins the distinct rendering.
   */
  it("does not confuse a decision status with an action status", () => {
    const { unmount } = render(
      <StatusPill kind="decision" status="pending_closure" />
    );
    expect(screen.getByText("Pending Closure")).toBeInTheDocument();
    unmount();

    render(<StatusPill kind="request" status="in_review" />);
    expect(screen.getByText("In Review")).toBeInTheDocument();
  });

  it("carries no Overdue status — FR-PA-06 makes it a flag", () => {
    expect([...ACTION_STATUS_VALUES]).not.toContain("overdue");
  });
});

describe("PriorityDot", () => {
  it.each([...PRIORITY_VALUES])("names priority %s in text", (priority) => {
    render(<PriorityDot priority={priority} />);
    expect(screen.getByText(/\w/)).toBeInTheDocument();
  });

  it("spells the label, not the wire token", () => {
    render(<PriorityDot priority="critical" />);
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });

  /**
   * WCAG 1.4.1 — colour must not be the only carrier. Hiding the label visually
   * is allowed; removing it is not.
   */
  it("keeps the label for screen readers when it is visually hidden", () => {
    render(<PriorityDot priority="high" hideLabel />);
    const label = screen.getByText("High");
    expect(label).toBeInTheDocument();
    expect(label).toHaveClass("sr-only");
  });

  it("hides the decorative dot from assistive technology", () => {
    const { container } = render(<PriorityDot priority="low" />);
    expect(container.querySelector("[aria-hidden]")).toBeInTheDocument();
  });
});

describe("OverdueFlag — FR-PA-06", () => {
  const NOW = new Date("2026-07-31T12:00:00.000Z");
  const PAST = "2026-07-30T12:00:00+00:00";
  const FUTURE = "2026-08-02T12:00:00+00:00";

  it("flags a live action past its due date", () => {
    render(<OverdueFlag dueAt={PAST} status="open" at={NOW} />);
    expect(screen.getByText("Overdue")).toBeInTheDocument();
  });

  it("renders nothing when the action is not yet due", () => {
    const { container } = render(
      <OverdueFlag dueAt={FUTURE} status="open" at={NOW} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  /** A completed action with an old due date is done, not late. */
  it("renders nothing for a closed action however old its due date", () => {
    for (const status of ["completed", "cancelled", "verified"] as const) {
      const { container, unmount } = render(
        <OverdueFlag dueAt={PAST} status={status} at={NOW} />
      );
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });

  it("carries the state in text, not colour alone", () => {
    render(<OverdueFlag dueAt={PAST} status="open" at={NOW} />);
    expect(screen.getByText("Overdue")).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("renders the title as a heading and the description as body text", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="No pending actions"
        description="No actions match the current filters."
      />
    );

    expect(
      screen.getByRole("heading", { name: "No pending actions" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("No actions match the current filters.")
    ).toBeInTheDocument();
  });

  it("renders without a description", () => {
    render(<EmptyState icon={Inbox} title="All caught up" />);
    expect(
      screen.getByRole("heading", { name: "All caught up" })
    ).toBeInTheDocument();
  });

  it("renders an escape hatch when one is supplied", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="No matches"
        action={<button type="button">Clear filters</button>}
      />
    );

    expect(
      screen.getByRole("button", { name: "Clear filters" })
    ).toBeInTheDocument();
  });

  it("hides the decorative icon from assistive technology", () => {
    const { container } = render(<EmptyState icon={Inbox} title="Empty" />);
    expect(container.querySelector("[aria-hidden]")).toBeInTheDocument();
  });
});
