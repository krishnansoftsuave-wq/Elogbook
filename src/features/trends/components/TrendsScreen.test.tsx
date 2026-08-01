import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { TrendsScreen } from "@/features/trends/components/TrendsScreen";
import { renderWithProviders } from "@/test/utils";
import {
  envelope,
  installMockApi,
  mockRoute,
  resetMockApi,
} from "@/test/mockApi";

/**
 * Regression test for a real bug: the heading read the hardcoded literal
 * "Production KPIs — 7-Day Trend" no matter which period pill was active, even
 * though `route.ts` already slices the KPI series to the requested window —
 * so the number on screen and the data behind it disagreed the moment anyone
 * clicked "30 days". `PERIOD_LABEL` (`PeriodPills.tsx`) is what the heading
 * now derives from instead.
 */

const trendsWire = (period: string) => ({
  period,
  production_kpis: [
    {
      code: "ADP",
      label: "Agreed Daily Prod.",
      unit: "MM",
      values: [42, 43],
      tone: "series-1",
    },
  ],
  compliance_categories: [],
  equipment_out_of_service: [],
  equipment_out_of_service_by_area: [],
  flare_purge_areas: [],
  olet: { count: 0 },
  next_ships: [],
});

describe("TrendsScreen", () => {
  beforeEach(() => {
    installMockApi({ permissions: ["report:read"] });

    mockRoute("GET", /\/shifts\/current$/, () =>
      envelope({
        shift_id: "20260801-D",
        label: "Day",
        starts_at: "2026-08-01T06:00:00+04:00",
        ends_at: "2026-08-01T18:00:00+04:00",
        overlap_minutes: 15,
      })
    );

    mockRoute("GET", /\/trends$/, (config) =>
      envelope(
        trendsWire((config.params as { period?: string })?.period ?? "7d")
      )
    );
  });

  afterEach(() => {
    resetMockApi();
  });

  it("names the active period in the Production KPIs heading", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TrendsScreen />);

    expect(
      await screen.findByRole("heading", {
        name: "Production KPIs — 7 days Trend",
      })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "30 days" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Production KPIs — 30 days Trend" })
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("heading", { name: "Production KPIs — 7 days Trend" })
    ).not.toBeInTheDocument();
  });
});
