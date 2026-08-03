import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { isIllustrativeWidget } from "@/features/dashboards/widgetRegistry";
import { RAG_TONE } from "@/features/plant-ops/schemas";
import {
  DueDateRagCard,
  FlarePurgeCard,
  NextShipsCard,
  OletCard,
  OutOfServiceCard,
  ProductionTrendCard,
} from "@/features/plant-ops/components/PlantOpsCards";
import {
  envelope,
  installMockApi,
  mockRoute,
  resetMockApi,
} from "@/test/mockApi";
import { renderWithProviders } from "@/test/utils";

/**
 * The prototype's `specKpiSection()` cards.
 *
 * ⚠️ **No `FR-` id appears in this file because no requirement covers these
 * screens.** They are built at the owner's request from invented figures. The
 * tests below therefore pin two different things: that the cards render the
 * prototype's content, and — more importantly — that the product never presents
 * that content as real.
 */

const PLANT_OPS = {
  due_categories: [{ label: "Active Force", counts: [2, 3, 4, 1, 0] }],
  production_days: ["Mon", "Tue"],
  production_series: [{ name: "ADP", unit: "MM", points: [42, 43] }],
  out_of_service: [
    {
      tag: "2P-1401A",
      reason: "Single-phase trip",
      area: "Train 2",
      out_since: "03 Jun 2026",
      expected_return: "18 Jul 2026",
    },
    {
      tag: "2E-1104C",
      reason: "Isolated",
      area: "Train 2",
      out_since: "05 Jun 2026",
      expected_return: "TBC",
    },
  ],
  flare_purge: [
    {
      area: "Flare Area 1",
      medium: "fuel_gas",
      since: "03 Jun 2026",
      reason: "Switched from N₂",
    },
  ],
  olet: [],
  next_ships: [
    { vessel: "Myrina LNG", eta: "26 Jun 2026 · 02:00", quantity: 1 },
  ],
};

const stub = (overrides: Record<string, unknown> = {}) => {
  mockRoute("GET", /\/plant-operations$/, () =>
    envelope({ ...PLANT_OPS, ...overrides })
  );
};

afterEach(() => {
  resetMockApi();
});

describe("plant-ops caveat", () => {
  /**
   * ⚠️ **This asserts the absence of a warning, which is not a good thing.**
   *
   * A "Sample data" banner used to sit above these six cards, saying they come
   * from the design prototype, are connected to no system, and must not be used
   * operationally. It was removed at the owner's request so the dashboard
   * matches the prototype, which carries no such warning.
   *
   * Inverted rather than deleted, on the same pattern as
   * `SystemMonitor.test.tsx`'s banner test: **none of the underlying facts
   * changed.** The equipment tags, production rates and vessel schedules on
   * these cards are invented (`mocks/data/plantOps.ts`) and no BRD requirement
   * covers any of the six. A deleted test would leave nothing to say so.
   *
   * If a notice is restored, delete this test rather than "fixing" it.
   */
  it("no longer warns that the figures are invented (owner decision)", async () => {
    installMockApi();
    stub();

    renderWithProviders(<OutOfServiceCard />);
    await screen.findByText("2P-1401A");

    expect(screen.queryByText(/Sample data/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/do not use them operationally/i)
    ).not.toBeInTheDocument();
  });
});

describe("widgetRegistry — illustrative marking", () => {
  it("marks every plant-ops widget, and nothing else", () => {
    for (const id of [
      "WID-008",
      "WID-009",
      "WID-010",
      "WID-011",
      "WID-012",
      "WID-013",
    ]) {
      expect(isIllustrativeWidget(id)).toBe(true);
    }

    // The requirement-backed widgets must not be tarred with the same brush.
    for (const id of ["WID-001", "WID-003", "WID-007"]) {
      expect(isIllustrativeWidget(id)).toBe(false);
    }
  });
});

describe("Plant operations cards", () => {
  it("plots the production series with its unit and an accessible table", async () => {
    installMockApi();
    stub();

    renderWithProviders(<ProductionTrendCard />);

    expect(
      await screen.findByRole("img", {
        name: /Production measures over the last seven days/,
      })
    ).toBeInTheDocument();

    // Five series share one axis, so the unit has to be on the series name.
    // Asserted through the accessible table rather than the legend: the legend
    // is Recharts' markup and may change with the library, while the table is
    // the guarantee this project owns.
    const table = screen.getByRole("table", {
      name: /Production measures over the last seven days/,
    });
    expect(
      within(table).getByRole("columnheader", { name: "ADP (MM)" })
    ).toBeInTheDocument();
  });

  /**
   * The defect this pins: an earlier version sliced the pie by *category*,
   * which totals the same 70 and looks entirely plausible while answering a
   * different question. The prototype aggregates across categories per RAG
   * bucket (`dueDateBars` 559) — "how much is overdue?".
   */
  it("slices the safety pie by due date, not by category", async () => {
    installMockApi();
    stub({
      due_categories: [
        { label: "Active Force", counts: [2, 3, 4, 1, 0] },
        { label: "Active AOF", counts: [1, 2, 2, 1, 0] },
      ],
    });

    renderWithProviders(<DueDateRagCard />);

    await userEvent.click(await screen.findByRole("button", { name: "Pie" }));

    const table = await screen.findByRole("table", {
      name: /Open safety items by due date/,
    });
    // Rows are the RAG buckets, not "Active Force" / "Active AOF".
    expect(
      within(table).getByRole("rowheader", { name: "Overdue" })
    ).toBeInTheDocument();
    expect(
      within(table).queryByRole("rowheader", { name: "Active Force" })
    ).not.toBeInTheDocument();
    // Overdue = 2 + 1 across both categories; 3 of 16 total = 19%.
    expect(within(table).getByText("3 (19%)")).toBeInTheDocument();
  });

  /**
   * `toneAt(index)` walks a *categorical* ramp (teal, teal-light, amber, green,
   * red), so used positionally it painted **Overdue teal and No date red** —
   * the opposite of what a due-date chart means to anybody who looks at it.
   *
   * Asserted on the mapping rather than on rendered markup. The rendered fill
   * is Recharts' business and changed shape when the library landed; the
   * *meaning* of each bucket's colour is this project's, and it is what a
   * future refactor could silently invert again.
   */
  it("maps each RAG bucket to a tone that means what it looks like", () => {
    expect(RAG_TONE.overdue).toBe("chart-5"); // red
    expect(RAG_TONE.due_7_days).toBe("chart-3"); // amber
    expect(RAG_TONE.due_30_days).toBe("chart-8"); // gold
    expect(RAG_TONE.beyond_30_days).toBe("chart-4"); // green
    expect(RAG_TONE.no_date).toBe("chart-9"); // neutral grey

    // The failure mode this guards: no bucket may take a tone by position.
    expect(RAG_TONE.overdue).not.toBe("chart-1");
    expect(RAG_TONE.no_date).not.toBe("chart-5");
  });

  it("lists equipment out of service", async () => {
    installMockApi();
    stub();

    renderWithProviders(<OutOfServiceCard />);

    expect(await screen.findByText("2P-1401A")).toBeInTheDocument();
    expect(screen.getByText("Single-phase trip")).toBeInTheDocument();
  });

  /**
   * "TBC" and "Next S/D" are the prototype's own values and are not dates.
   * Rendering them like a commitment would overstate what is known.
   */
  it("distinguishes an unknown return date from a real one", async () => {
    installMockApi();
    stub();

    renderWithProviders(<OutOfServiceCard />);

    const unknown = await screen.findByText("TBC");
    const known = screen.getByText("18 Jul 2026");
    expect(unknown.className).toContain("text-muted-foreground");
    expect(known.className).toContain("text-warning");
  });

  it("names the purge medium in words, not only by icon", async () => {
    installMockApi();
    stub();

    renderWithProviders(<FlarePurgeCard />);

    expect(await screen.findByText("Flare Area 1")).toBeInTheDocument();
    // WCAG 1.4.1 — the flame icon is aria-hidden, so the medium is text.
    expect(screen.getByText("Fuel gas")).toBeInTheDocument();
  });

  /** The prototype ships this table empty — "empty state per spec" (719). */
  it("shows OLET's empty state rather than inventing rows", async () => {
    installMockApi();
    stub();

    renderWithProviders(<OletCard />);

    expect(
      await screen.findByText(/No OLET items reported this shift/)
    ).toBeInTheDocument();

    /*
      The columns stay. The prototype calls `dataTable(headers, [], {empty})`
      (721), keeping the header and putting the message in the body — which is
      the right call for a table that is empty on most shifts, because the
      columns are what tell a reader the card reports items, equipment and due
      dates. An earlier assertion here required the table to be *absent*, which
      would have locked in the weaker behaviour.
    */
    const table = screen.getByRole("table");
    expect(
      within(table).getByRole("columnheader", { name: "Equipment" })
    ).toBeInTheDocument();
  });

  it("renders the berthing schedule as a table", async () => {
    installMockApi();
    stub();

    renderWithProviders(<NextShipsCard />);

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Myrina LNG")).toBeInTheDocument();
    expect(within(table).getByText("26 Jun 2026 · 02:00")).toBeInTheDocument();
  });

  it("reports a failed load rather than an empty card", async () => {
    installMockApi();
    mockRoute(
      "GET",
      /\/plant-operations$/,
      () => ({
        success: false,
        error: { code: "forbidden", message: "Denied." },
      }),
      403
    );

    renderWithProviders(<NextShipsCard />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /could not be loaded/i
    );
  });
});
