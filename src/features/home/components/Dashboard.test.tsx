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

/**
 * The dashboard is composed from the widget library now (FR-DASH-01), so every
 * test needs one. This is the seed's shape: the six widgets that have a
 * renderer, all assigned to the three configurable roles.
 *
 * `Repeating Issues` is deliberately absent rather than present-and-disabled —
 * `useRoleWidgets` filters it either way, and a test fixture that carries a row
 * no assertion touches invites the next reader to think it matters.
 */
const widget = (
  id: string,
  label: string,
  type = "list",
  roles: readonly string[] = ["operator", "supervisor", "management"]
) => ({ id, label, type, assigned_roles: roles, enabled: true });

const ALL_WIDGETS = [
  widget("WID-001", "Shift KPIs", "kpi"),
  widget("WID-002", "Current Shift Highlights"),
  widget("WID-003", "Critical Alarms"),
  widget("WID-004", "Previous Shift Summary Report", "summary"),
  widget("WID-006", "Safety Observations"),
  widget("WID-007", "Pending Actions by Status", "chart"),
];

const SUPER_USER = {
  roles: ["super_user"],
  permissions: ["dashboard:configure", "user:read"],
};

/**
 * The library as the seed has it for the Super User's four: WID-001 plus the
 * three platform widgets, assigned to nobody. Assignment is irrelevant to this
 * role — `useRoleWidgets` picks their set by id — and an empty `assigned_roles`
 * is what keeps the fixture honest about that.
 *
 * A published widget the Super User's list does *not* name is included so the
 * selection has something to exclude.
 */
const SUPER_USER_LIBRARY = [
  widget("WID-001", "Shift KPIs", "kpi", []),
  widget("WID-003", "Critical Alarms", "list", ["operator"]),
  widget("WID-014", "Active Users", "list", []),
  widget("WID-015", "System Health", "list", []),
  widget("WID-016", "Logbook Compliance", "kpi", []),
];

/** What the three platform cards and the activity strip read. */
const stubPlatformOverview = () => {
  mockRoute("GET", /\/platform-overview$/, () =>
    envelope({
      audit_events_today: 486,
      active_users_24h: 142,
      provisioned_users: 190,
      custom_dashboards: 7,
      custom_dashboard_roles: 4,
      active_roles: 9,
      total_roles: 12,
      users_by_role: [{ role: "operator", count: 24 }],
      services: [{ name: "AD FS / SAML", status: "healthy" }],
      last_backup_at: "2026-06-24T02:00:00+04:00",
      compliance_percent: 96,
    })
  );
};

const stubAll = (
  options: {
    actions?: readonly unknown[];
    sections?: readonly unknown[];
    summaries?: readonly unknown[];
    widgets?: readonly unknown[];
    layout?: readonly unknown[];
  } = {}
) => {
  mockRoute("GET", /\/dashboards\/widgets$/, () =>
    envelope({ items: options.widgets ?? ALL_WIDGETS })
  );
  // FR-DASH-04's personal layout. Empty is the normal state — every user
  // starts on their role's standard order until they change something.
  mockRoute("GET", /\/me\/dashboard-layout$/, () =>
    envelope({ items: options.layout ?? [] })
  );
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
   * The banner names the current shift, in the prototype's own wording —
   * `"<date> · <LABEL> Shift"` (app-source.txt 1127).
   *
   * ⚠️ **This test previously also required the handover overlap**, and was
   * titled "shows the current shift and its handover overlap (FR-HOME-03)".
   * The owner asked for the banner's text to match the prototype verbatim, and
   * the prototype's line carries neither the shift times nor the overlap. The
   * requirement *defines* a 12-hour shift with a 06:00–06:15 overlap; it does
   * not require this strip to print it, so removing the assertion is not
   * removing coverage of FR-HOME-03 — `mocks/shifts/current.test.ts` still pins
   * the overlap on the endpoint that serves it.
   *
   * What genuinely is gone is the overlap being *visible to an operator*. That
   * is recorded beside `ShiftContextBanner` as a decision to confirm.
   */
  it("names the current shift in the prototype's wording", async () => {
    stubAll();

    renderWithProviders(<Dashboard />);

    expect(await screen.findByText(/31 Jul 2026 · DAY Shift/)).toBeVisible();
    expect(screen.queryByText(/handover overlap/)).not.toBeInTheDocument();
  });

  /** The heading's subtitle is the same shift, in the prototype's other casing. */
  it("puts the shift under the heading, not a tagline", async () => {
    stubAll();

    renderWithProviders(<Dashboard />);

    expect(await screen.findByText("Day shift · 31 Jul 2026")).toBeVisible();
    expect(
      screen.queryByText(/Current-shift highlights/)
    ).not.toBeInTheDocument();
  });

  /**
   * **FR-HOME-02** — the view defaults to "everything the user may see (full
   * plant)". §9.2 records that the client removed area filtering, so there is no
   * scope selector and the banner says so.
   */
  it("states full-plant scope and offers no area filter (FR-HOME-02)", async () => {
    stubAll();

    renderWithProviders(<Dashboard />);

    // Title Case and `+` separators — the prototype's string verbatim.
    expect(
      await screen.findByText(
        /Entire Plant — 3 Trains \+ Common Facilities \+ Storage & Shipping/
      )
    ).toBeVisible();
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

/**
 * **FR-DASH-01** — "predefined, role-based dashboards … for standardisation".
 *
 * The dashboard composes itself from the widget library rather than listing its
 * cards, so "layout may vary by role" (FR-HOME-01) is a data question. These
 * pin that it really is one — there is no `switch (role)` to assert against.
 */
describe("Dashboard — role-driven composition (FR-DASH-01)", () => {
  it("shows a role only the widgets assigned to it", async () => {
    installMockApi({ roles: ["management"] });
    stubAll({
      widgets: [
        widget("WID-003", "Critical Alarms", "list", ["management"]),
        widget("WID-002", "Current Shift Highlights", "list", ["operator"]),
      ],
    });

    renderWithProviders(<Dashboard />);

    expect(
      await screen.findByText("B-train compressor trip at 02:14")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Routine N2 purge completed on Unit 3")
    ).not.toBeInTheDocument();
  });

  /** The Super User's publish switch is a standardisation control, not a hint. */
  it("hides an unpublished widget from everyone it is assigned to", async () => {
    stubAll({
      widgets: [
        { ...widget("WID-003", "Critical Alarms"), enabled: false },
        widget("WID-002", "Current Shift Highlights"),
      ],
    });

    renderWithProviders(<Dashboard />);

    expect(
      await screen.findByText("Routine N2 purge completed on Unit 3")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("B-train compressor trip at 02:14")
    ).not.toBeInTheDocument();
  });

  /**
   * WID-005 is the live case: assignable, but **FR-AN-06** leaves its counting
   * definitions "to be confirmed", so nothing can draw it. It must not leave a
   * titled empty box behind.
   */
  it("draws nothing for an assigned widget this build cannot render", async () => {
    stubAll({
      widgets: [
        widget("WID-005", "Repeating Issues"),
        widget("WID-003", "Critical Alarms"),
      ],
    });

    renderWithProviders(<Dashboard />);
    await screen.findByText("B-train compressor trip at 02:14");

    expect(screen.queryByText("Repeating Issues")).not.toBeInTheDocument();
  });

  /**
   * Reachable by unassigning every widget from a role. A blank page would read
   * as a failed load, so it says what happened and who can undo it.
   */
  it("explains an empty dashboard rather than rendering nothing", async () => {
    stubAll({ widgets: [] });

    renderWithProviders(<Dashboard />);

    expect(
      await screen.findByText(/no dashboard widgets are assigned to your role/i)
    ).toBeInTheDocument();
  });

  /**
   * FR-DASH-01 gives the config screen three columns, so a Super User filtered
   * by assignment would get an empty dashboard **nobody has any way to fill**.
   * They get the prototype's own set instead — `defaultWidgets('superuser')`
   * (app-source.txt 139): System KPIs, Active Users, System Health and Logbook
   * Compliance, in that order.
   *
   * This replaced a published-set fallback that handed the Super User all
   * twelve renderable widgets, six of them plant-operations cards. "Everything
   * that exists" is not a dashboard anyone designed, and it is not the screen
   * the client was shown.
   */
  it("gives the Super User the prototype's four widgets, in its order", async () => {
    installMockApi(SUPER_USER);
    stubAll({ widgets: SUPER_USER_LIBRARY });
    stubPlatformOverview();

    renderWithProviders(<Dashboard />);

    // Present: the three platform cards, plus WID-001's tiles.
    expect(await screen.findByText("Active users")).toBeInTheDocument();
    expect(screen.getByText("System health")).toBeInTheDocument();
    expect(screen.getByText("Logbook compliance")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Shift KPIs" })
    ).toBeInTheDocument();

    // Absent: a published widget that is not in the Super User's set.
    expect(
      screen.queryByText("B-train compressor trip at 02:14")
    ).not.toBeInTheDocument();
  });

  /**
   * The prototype's order is `kpi, users, health, compliance`. The library
   * lists the platform widgets after WID-001 but before nothing in particular,
   * so selecting by filter rather than by the id list would quietly follow the
   * library's order instead of the designed one.
   */
  it("follows the prototype's order rather than the library's", async () => {
    installMockApi(SUPER_USER);
    stubAll({
      widgets: [
        widget("WID-016", "Logbook Compliance", "kpi", []),
        widget("WID-015", "System Health", "list", []),
        widget("WID-014", "Active Users", "list", []),
        widget("WID-001", "Shift KPIs", "kpi", []),
      ],
    });
    stubPlatformOverview();

    renderWithProviders(<Dashboard />);
    await screen.findByText("Active users");

    const titles = screen
      .getAllByText(/^(Active users|System health|Logbook compliance)$/)
      .map((node) => node.textContent);
    expect(titles).toEqual([
      "Active users",
      "System health",
      "Logbook compliance",
    ]);
  });

  /**
   * The Super User's set is chosen in code, but it is still *selected from* the
   * published library — so unpublishing a widget must still remove it, or
   * FR-DASH-02's standardisation control would have a hole in it.
   */
  it("still drops a Super User widget the library has unpublished", async () => {
    installMockApi(SUPER_USER);
    stubAll({
      widgets: SUPER_USER_LIBRARY.map((row) =>
        row.id === "WID-015" ? { ...row, enabled: false } : row
      ),
    });
    stubPlatformOverview();

    renderWithProviders(<Dashboard />);
    await screen.findByText("Active users");

    expect(screen.queryByText("System health")).not.toBeInTheDocument();
  });

  /**
   * The Logbook Activity strip sits above the grid with no drag handle, hide
   * control or resize — the prototype renders it before `widgets.map` (1146),
   * and only on the screen the Super User reaches.
   */
  it("gives the Super User a fixed activity strip and nobody else", async () => {
    installMockApi(SUPER_USER);
    stubAll({ widgets: SUPER_USER_LIBRARY });
    stubPlatformOverview();

    renderWithProviders(<Dashboard />);

    expect(
      await screen.findByText("Logbook activity — this shift")
    ).toBeInTheDocument();
    // Not a widget: no personalisation control names it.
    expect(
      screen.queryByRole("button", {
        name: /Logbook activity — this shift/,
      })
    ).not.toBeInTheDocument();
  });

  it("draws no activity strip for an operational role", async () => {
    stubAll();

    renderWithProviders(<Dashboard />);
    await screen.findByText("Pending actions by status");

    expect(
      screen.queryByText("Logbook activity — this shift")
    ).not.toBeInTheDocument();
  });

  /**
   * The other half of that rule, and the one that makes FR-DASH-02 enforceable:
   * a *configurable* role with nothing assigned must stay empty. Falling back on
   * "the filter returned nothing" would hand every widget back to an Operator
   * the Super User had just cleared.
   */
  it("keeps a configurable role empty when its assignment is cleared", async () => {
    stubAll({
      widgets: [widget("WID-003", "Critical Alarms", "list", ["management"])],
    });

    renderWithProviders(<Dashboard />);

    expect(
      await screen.findByText(/no dashboard widgets are assigned to your role/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByText("B-train compressor trip at 02:14")
    ).not.toBeInTheDocument();
  });

  /** An error is not "no widgets assigned" — the two must not look alike. */
  it("distinguishes a failed widget load from an empty one", async () => {
    stubAll();
    mockRoute(
      "GET",
      /\/dashboards\/widgets$/,
      () => ({
        success: false,
        error: { code: "forbidden", message: "Permission denied." },
      }),
      403
    );

    renderWithProviders(<Dashboard />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /the dashboard could not be loaded/i
    );
  });

  /**
   * The two failures are not the same failure, and the copy must not claim they
   * are.
   *
   * A failed **layout** read costs this user their arrangement; the cards
   * themselves still render, in the role's default order. The banner used to say
   * "the cards below cannot be shown" for both cases — directly above six fully
   * populated cards — because one merged `isError` drove it while the grid was
   * gated on `arranged.length` instead.
   *
   * It also has to switch personalisation off: on a failed read the hook cannot
   * tell "no saved layout" from "could not read the saved layout", so the first
   * edit would `PUT` the default order over the user's real one and succeed
   * silently.
   */
  it("keeps the cards, and withdraws personalisation, when only the layout fails", async () => {
    stubAll();
    /*
      403 rather than 500: `retryUnlessClientError` retries a 5xx once, and the
      backoff outlives `findByRole`'s default timeout, so the assertion would
      race the retry rather than test the error state. A client error reaches the
      same state immediately.
    */
    mockRoute(
      "GET",
      /\/me\/dashboard-layout$/,
      () => ({
        success: false,
        error: { code: "forbidden", message: "Permission denied." },
      }),
      403
    );

    renderWithProviders(<Dashboard />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /your saved layout could not be loaded/i
    );
    // `find`, not `get`: this card resolves through two further requests.
    expect(
      await screen.findByText("B-train compressor trip at 02:14")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Personalise" })
    ).not.toBeInTheDocument();
  });
});
