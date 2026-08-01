import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WidgetReorderList } from "@/features/dashboard-builder/components/WidgetReorderList";
import type { DashboardBuilderWidget } from "@/features/dashboard-builder/schemas";
import { renderWithProviders } from "@/test/utils";

const widgets: DashboardBuilderWidget[] = [
  { id: "DBW-001", label: "Shift KPIs", type: "kpi", enabled: true, order: 0 },
  {
    id: "DBW-002",
    label: "Critical Alarms",
    type: "list",
    enabled: true,
    order: 1,
  },
];

describe("WidgetReorderList", () => {
  it("renders every widget with its label and type", () => {
    renderWithProviders(
      <WidgetReorderList widgets={widgets} onChange={vi.fn()} />
    );

    expect(screen.getByText("Shift KPIs")).toBeVisible();
    expect(screen.getByText("Critical Alarms")).toBeVisible();
    expect(screen.getByText("KPI")).toBeVisible();
    expect(screen.getByText("LIST")).toBeVisible();
  });

  it("toggles a widget's enabled switch and calls onChange with the update", async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <WidgetReorderList widgets={widgets} onChange={onChange} />
    );

    await userEvent.click(
      screen.getByRole("switch", { name: "Shift KPIs enabled" })
    );

    expect(onChange).toHaveBeenCalledWith([
      { ...widgets[0], enabled: false },
      widgets[1],
    ]);
  });

  it("removes a widget and calls onChange without it", async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <WidgetReorderList widgets={widgets} onChange={onChange} />
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Remove Shift KPIs" })
    );

    expect(onChange).toHaveBeenCalledWith([widgets[1]]);
  });

  it("exposes a keyboard-focusable drag handle per widget", () => {
    renderWithProviders(
      <WidgetReorderList widgets={widgets} onChange={vi.fn()} />
    );

    // Real reordering is exercised end-to-end (`e2e/dashboard-builder.spec.ts`):
    // dnd-kit's keyboard sensor computes the next position from sibling
    // `getBoundingClientRect()`s, which jsdom always returns as zero-rects, so
    // a unit test cannot observe a real move. What a unit test *can* pin is
    // that the handle exists, is a real focusable element, and is named — the
    // accessibility bar `03-testing-review.md` sets for "keyboard reachable".
    for (const widget of widgets) {
      const handle = screen.getByRole("button", {
        name: `Reorder ${widget.label}`,
      });
      expect(handle).toBeVisible();
      expect(handle).not.toHaveAttribute("disabled");
    }
  });
});
