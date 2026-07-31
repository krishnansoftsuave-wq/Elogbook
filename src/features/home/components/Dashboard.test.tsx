import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Dashboard } from "@/features/home/components/Dashboard";
import { DASHBOARD_REFRESH } from "@/lib/query-refresh";
import { renderWithProviders } from "@/test/utils";
import {
  envelope,
  installMockApi,
  mockRoute,
  paginatedEnvelope,
  resetMockApi,
} from "@/test/mockApi";

const ACTOR = {
  username: "said.albusaidi",
  display_name: "Said Al-Busaidi",
} as const;

const hours = (offset: number) =>
  new Date(Date.now() + offset * 3_600_000)
    .toISOString()
    .replace(/Z$/, "+00:00");

const action = (overrides: Record<string, unknown> = {}) => ({
  id: "ACT-2041",
  title: "Relief valve XV-118 set-pressure verification",
  area: "B-train",
  equipment: "XV-118",
  priority: "critical",
  status: "open",
  source: "ai_suggested",
  category: "safety",
  description: "Confirm set pressure.",
  due_at: hours(24),
  created_at: hours(-24),
  created_by: ACTOR,
  owner: null,
  ...overrides,
});

const SUMMARY_ID = "SUM-20260731-D";

const summaryListRow = {
  id: SUMMARY_ID,
  shift_id: "20260731-D",
  name: "Day Shift – 31 Jul 2026",
  window_label: "Day (06:00–18:00)",
  shift_date: "20260731",
  generated_at: "2026-07-31T14:05:00+00:00",
  generated_by: ACTOR,
  generated_by_role: "Operator",
  generation: "end_of_shift",
} as const;

const summaryDetail = (sections: readonly unknown[]) => ({
  ...summaryListRow,
  sections,
  comments: [],
  ai_confirmations: [],
});

const SECTIONS = [
  {
    kind: "activities",
    items: [
      {
        text: "Routine N2 purge completed on Unit 3",
        severity: "low",
        record_id: "ELB-20260731-0058",
      },
    ],
  },
  {
    kind: "critical_alarms",
    items: [
      {
        text: "B-train compressor trip at 02:14",
        severity: "critical",
        record_id: "ELB-20260731-0042",
      },
    ],
  },
  {
    kind: "safety_observations",
    items: [
      {
        text: "Housekeeping near pump house flagged",
        severity: "low",
        record_id: "ELB-20260731-0066",
      },
    ],
  },
] as const;

const stubAll = (
  options: {
    actions?: readonly unknown[];
    sections?: readonly unknown[];
    summaries?: readonly unknown[];
  } = {}
) => {
  mockRoute("GET", /\/shifts\/current$/, () =>
    envelope({
      shift_id: "20260731-D",
      label: "Day",
      starts_at: "2026-07-31T02:00:00+00:00",
      ends_at: "2026-07-31T14:00:00+00:00",
      overlap_minutes: 15,
    })
  );
  mockRoute("GET", /\/actions$/, () =>
    paginatedEnvelope(options.actions ?? [action()])
  );
  mockRoute("GET", /\/summaries$/, () =>
    paginatedEnvelope(options.summaries ?? [summaryListRow], { total: 14 })
  );
  mockRoute("GET", /\/summaries\/[^/]+$/, () =>
    envelope(summaryDetail(options.sections ?? SECTIONS))
  );
};

beforeEach(() => {
  installMockApi();
});

afterEach(() => {
  resetMockApi();
  vi.restoreAllMocks();
});

describe("Dashboard", () => {
  /**
   * **FR-HOME-03** — "Define a shift as a 12-hour period (06:00–06:15 overlap)".
   * The overlap is the handover window, which is the thing this banner exists to
   * tell an operator walking in.
   */
  it("shows the current shift and its handover overlap (FR-HOME-03)", async () => {
    stubAll();

    renderWithProviders(<Dashboard />);

    expect(
      await screen.findByText(/Day shift · 06:00 GST–18:00 GST/)
    ).toBeVisible();
    expect(screen.getByText(/15-minute handover overlap/)).toBeVisible();
  });

  /**
   * **FR-HOME-02** — the view defaults to "everything the user may see (full
   * plant)". §9.2 records that the client removed area filtering, so there is no
   * scope selector and the banner says so.
   */
  it("states full-plant scope and offers no area filter (FR-HOME-02)", async () => {
    stubAll();

    renderWithProviders(<Dashboard />);

    expect(await screen.findByText(/Entire plant/)).toBeVisible();
    expect(screen.queryByLabelText(/Filter by area/)).not.toBeInTheDocument();
  });

  /**
   * Scoped to the KPI region for two reasons: a tile renders its label
   * immediately and its number only once the count arrives, and the status words
   * the tiles use also appear in the donut's legend and accessible table beside
   * them — an unscoped `getByText("Open")` matches both.
   */
  const expectTile = async (label: string, value: string) => {
    const kpis = await screen.findByRole("region", { name: "Shift KPIs" });
    const card = within(kpis).getByText(label).closest("[data-slot=card]");
    expect(card).not.toBeNull();
    await waitFor(() => expect(card).toHaveTextContent(value));
  };

  /** FR-HOME-01's "pending actions", as counts. */
  it("counts pending actions by status", async () => {
    stubAll({
      actions: [
        action({ id: "ACT-1", status: "open" }),
        action({ id: "ACT-2", status: "open" }),
        action({ id: "ACT-3", status: "in_progress" }),
        action({ id: "ACT-4", status: "verified" }),
      ],
    });

    renderWithProviders(<Dashboard />);

    await expectTile("Open", "2");
    await expectTile("In progress", "1");
    await expectTile("Verified", "1");
  });

  /** FR-PA-06's derived flag, counted at one instant for every row. */
  it("counts overdue actions separately from any status", async () => {
    stubAll({
      actions: [
        action({ id: "ACT-1", status: "open", due_at: hours(-2) }),
        action({ id: "ACT-2", status: "open", due_at: hours(48) }),
        // Closed states are never overdue, however old.
        action({ id: "ACT-3", status: "verified", due_at: hours(-99) }),
      ],
    });

    renderWithProviders(<Dashboard />);

    await expectTile("Overdue", "1");
    // Overdue is a flag, not a status: both open rows still count as open.
    await expectTile("Open", "2");
  });

  /**
   * Three of FR-HOME-01's four named items come from the newest summary. Each
   * item keeps its `recordId` — FR-SUM-06 — because a critical alarm with no
   * traceable source is the thing that requirement exists to prevent.
   */
  it("renders highlights, alarms and safety observations with their sources", async () => {
    stubAll();

    renderWithProviders(<Dashboard />);

    expect(
      await screen.findByText("B-train compressor trip at 02:14")
    ).toBeVisible();
    expect(
      screen.getByText("Routine N2 purge completed on Unit 3")
    ).toBeVisible();
    expect(
      screen.getByText("Housekeeping near pump house flagged")
    ).toBeVisible();

    expect(screen.getByText("ELB-20260731-0042")).toBeVisible();
    expect(screen.getByText("ELB-20260731-0058")).toBeVisible();
  });

  it("links to the previous shift summary", async () => {
    stubAll();

    renderWithProviders(<Dashboard />);

    const link = await screen.findByRole("link", { name: "Open summary" });
    expect(link).toHaveAttribute("href", `/summaries/${SUMMARY_ID}`);
  });

  it("says so when a section is empty rather than showing a blank card", async () => {
    stubAll({
      sections: [
        { kind: "activities", items: [] },
        { kind: "critical_alarms", items: [] },
        { kind: "safety_observations", items: [] },
      ],
    });

    renderWithProviders(<Dashboard />);

    expect(await screen.findByText("No critical alarms")).toBeVisible();
    expect(screen.getByText("No safety observations")).toBeVisible();
  });

  it("handles a plant with no summaries at all", async () => {
    stubAll({ summaries: [] });

    renderWithProviders(<Dashboard />);

    expect(await screen.findByText("No summary yet")).toBeVisible();
  });

  /**
   * **FR-DASH-04** limits a regular user to hiding, resizing and saving widget
   * layout; §6.4 gives chart-type switching to the Administrator. The prototype
   * puts a bar/pie toggle on the operator's dashboard (app-source.txt 561) — the
   * BRD outranks it, so there is no toggle here.
   */
  it("offers no chart-type toggle to a regular user (FR-DASH-04)", async () => {
    stubAll();

    renderWithProviders(<Dashboard />);

    await screen.findByText("Pending actions by status");
    expect(screen.queryByRole("group", { name: /Chart type/ })).toBeNull();
  });

  /**
   * The chart carries the WCAG equivalent `ChartFrame` provides — a real table
   * of the same series, not an `aria-label` summarising it.
   */
  it("gives the status chart an accessible table equivalent", async () => {
    stubAll();

    renderWithProviders(<Dashboard />);

    expect(
      await screen.findByRole("img", { name: "Pending actions by status" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "Pending actions by status" })
    ).toBeInTheDocument();
  });

  /**
   * **FR-HOME-05** — "Refresh on-screen information in near-real-time (target
   * ~1 minute)."
   *
   * This asserts the *configuration*, not elapsed behaviour. A test that waited
   * for a real 60-second tick would take a minute; one that waited 250ms and saw
   * no second request — which is what this test used to do — cannot tell
   * "refreshes every minute" from "never refreshes again", and it passed for a
   * year of wall-clock reasons while the screen was frozen.
   */
  it("refreshes on FR-HOME-05's cadence and pauses in a background tab", () => {
    expect(DASHBOARD_REFRESH.refetchInterval).toBe(60_000);
    // NFR-03: the cost scales with screens someone is looking at, not with tabs
    // left open.
    expect(DASHBOARD_REFRESH.refetchIntervalInBackground).toBe(false);
  });

  /**
   * The KPI counts are tallied client-side over one capped page. Past the cap
   * the numbers are a floor, and the screen has to say so — the hook returns
   * `total` alongside `counted` precisely so it can.
   */
  it("says so when the counts are only a partial tally", async () => {
    stubAll();
    mockRoute("GET", /\/actions$/, () =>
      // Two rows returned, a hundred claimed: the cap has bitten.
      paginatedEnvelope([action({ id: "ACT-1" }), action({ id: "ACT-2" })], {
        total: 100,
      })
    );

    renderWithProviders(<Dashboard />);

    expect(
      await screen.findByText(/Counts cover the 2 most recent of 100 actions/)
    ).toBeVisible();
  });

  it("shows no partial-count warning when the page holds everything", async () => {
    stubAll();

    renderWithProviders(<Dashboard />);
    await screen.findByText("Pending actions by status");

    expect(screen.queryByText(/Counts cover the/)).not.toBeInTheDocument();
  });

  /**
   * Both the KPI tiles and the donut read `useActionStatusCounts`, and all four
   * summary cards read `useLatestSummary` — one query key each, so the screen
   * makes one request per resource rather than one per widget.
   */
  it("shares one request across the widgets that read the same resource", async () => {
    stubAll();
    let summaryListRequests = 0;
    mockRoute("GET", /\/summaries$/, () => {
      summaryListRequests += 1;
      return paginatedEnvelope([summaryListRow], { total: 14 });
    });

    renderWithProviders(<Dashboard />);
    await screen.findByText("B-train compressor trip at 02:14");

    expect(summaryListRequests).toBe(1);
  });
});
