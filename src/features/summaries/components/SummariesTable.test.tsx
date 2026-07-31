import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SummariesTable } from "@/features/summaries/components/SummariesTable";
import { renderWithProviders } from "@/test/utils";
import {
  installMockApi,
  mockRoute,
  paginatedEnvelope,
  resetMockApi,
} from "@/test/mockApi";

const ACTOR = {
  username: "said.albusaidi",
  display_name: "Said Al-Busaidi",
} as const;

const summaryRow = (overrides: Record<string, unknown> = {}) => ({
  id: "SUM-20260731-D",
  shift_id: "20260731-D",
  name: "Day Shift – 31 Jul 2026",
  window_label: "Day (06:00–18:00)",
  shift_date: "20260731",
  generated_at: "2026-07-31T14:05:00+00:00",
  generated_by: ACTOR,
  generated_by_role: "Operator",
  generation: "end_of_shift",
  ...overrides,
});

/** Captures the query string the component actually requested. */
let lastQuery = "";

beforeEach(() => {
  lastQuery = "";
  installMockApi();
});

afterEach(() => {
  resetMockApi();
});

const stubList = (
  rows: readonly unknown[] = [summaryRow()],
  total?: number
) => {
  mockRoute("GET", /\/summaries$/, (config) => {
    lastQuery = new URLSearchParams(
      (config.params ?? {}) as Record<string, string>
    ).toString();
    return paginatedEnvelope(rows, { total: total ?? rows.length });
  });
};

describe("SummariesTable", () => {
  it("renders a row per summary, through the real Zod boundary", async () => {
    stubList([
      summaryRow(),
      summaryRow({
        id: "SUM-20260730-N",
        name: "Night Shift – 30 Jul 2026",
        shift_date: "20260730",
      }),
    ]);

    renderWithProviders(<SummariesTable />);

    expect(
      await screen.findByRole("link", { name: "SUM-20260731-D" })
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "SUM-20260730-N" })).toBeVisible();
    expect(screen.getByText("Day Shift – 31 Jul 2026")).toBeVisible();
  });

  /**
   * The prototype hangs `onClick` on the `<tr>` (app-source.txt 1381), which no
   * keyboard can reach and no one can open in a new tab.
   */
  it("navigates by a real link, not a row click handler", async () => {
    stubList();

    renderWithProviders(<SummariesTable />);

    const link = await screen.findByRole("link", { name: "SUM-20260731-D" });
    expect(link).toHaveAttribute("href", "/summaries/SUM-20260731-D");
  });

  /** FR-SUM-06 / the list's own columns: the shift date, not the raw key. */
  it("renders the shift date and generation time in plant time", async () => {
    stubList();

    renderWithProviders(<SummariesTable />);

    expect(await screen.findByText("31 Jul 2026")).toBeVisible();
    // 14:05 UTC is 18:05 GST — the shift's own clock, not the runner's.
    expect(screen.getByText("18:05 GST")).toBeVisible();
  });

  it("shows an empty message when the plant has no summaries", async () => {
    stubList([], 0);

    renderWithProviders(<SummariesTable />);

    expect(await screen.findByText("No shift summaries yet.")).toBeVisible();
  });

  it("tells the user filters are why the table is empty", async () => {
    stubList([], 0);

    renderWithProviders(<SummariesTable />);
    await screen.findByText("No shift summaries yet.");

    await userEvent.type(
      screen.getByLabelText("Search summaries"),
      "nothing-matches"
    );

    expect(
      await screen.findByText("No summaries match these filters.")
    ).toBeVisible();
  });

  /**
   * **FR-HOME-04** — "Allow browsing of previous shifts, dates, and other
   * areas." The date bounds must reach the server; filtering fourteen rows in
   * the browser would look identical on the seeded plant and be wrong on a real
   * one.
   */
  it("sends the date range to the server (FR-HOME-04)", async () => {
    stubList();

    renderWithProviders(<SummariesTable />);
    await screen.findByRole("link", { name: "SUM-20260731-D" });

    const from = screen.getByLabelText("From");
    await userEvent.type(from, "2026-07-01");

    await waitFor(() => expect(lastQuery).toContain("from=2026-07-01"));
  });

  it("omits an empty date bound rather than sending it blank", async () => {
    stubList();

    renderWithProviders(<SummariesTable />);
    await waitFor(() => expect(lastQuery).not.toBe(""));

    expect(lastQuery).not.toContain("from=");
    expect(lastQuery).not.toContain("to=");
    expect(lastQuery).toContain("page=1");
  });

  /**
   * The prototype's subtitle says "· 24 total" while its array holds 14
   * (app-source.txt 1373, 92–105). The count here is the server's.
   */
  it("reports the server's total, not the number of rows on this page", async () => {
    stubList([summaryRow()], 14);

    renderWithProviders(<SummariesTable />);
    await screen.findByRole("link", { name: "SUM-20260731-D" });

    expect(screen.getByText(/14/)).toBeVisible();
  });
});
