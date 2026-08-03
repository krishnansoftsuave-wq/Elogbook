import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Dashboard } from "@/features/home/components/Dashboard";
import { SystemMonitor } from "@/features/monitoring/components/SystemMonitor";
import { usageStatus } from "@/features/monitoring/schemas";
import {
  envelope,
  installMockApi,
  mockRoute,
  paginatedEnvelope,
  resetMockApi,
} from "@/test/mockApi";
import { renderWithProviders } from "@/test/utils";

/**
 * §7.11 — **FR-OBS-04** (live usage with history/trend) and **FR-OBS-02**
 * (system and model performance).
 */

const TELEMETRY = {
  generated_at: "2026-08-01T10:30:00+00:00",
  overall_status: "warning",
  audit_events_today: 486,
  active_users_24h: 142,
  provisioned_users: 190,
  deleted_entries: 3,
  data_completeness_percent: 88,
  total_users: 39,
  active_users: 28,
  online_users: 12,
  peak_concurrent_users: 34,
  new_registrations: 5,
  activity_trend: [14, 18, 22, 19, 26, 24],
  services: [
    { name: "Authentication · SAML", status: "healthy" },
    { name: "Historian Sync", status: "warning" },
  ],
  api_status: "healthy",
  database_status: "healthy",
  error_rate_percent: 0.4,
  error_rate_history: [0.6, 0.5, 0.4],
  ai_accuracy_percent: 94.2,
  ai_response_ms: 480,
  ai_requests_today: 18243,
  ai_success_percent: 98.7,
  ai_failed_today: 237,
  cpu_percent: 42,
  memory_percent: 63,
  disk_percent: 57,
  network_percent: 38,
  api_response_ms: 120,
  api_response_history: [110, 125, 118],
};

/**
 * How many times the telemetry endpoint has been hit since the last
 * `stubTelemetry`. The auto-refresh test asserts on traffic rather than on the
 * switch's own state — see the note there.
 */
let telemetryHits = 0;
const telemetryRequests = (): number => telemetryHits;

const stubTelemetry = (overrides: Record<string, unknown> = {}) => {
  telemetryHits = 0;
  mockRoute("GET", /\/admin\/monitoring$/, () => {
    telemetryHits += 1;
    return envelope({ ...TELEMETRY, ...overrides });
  });
};

afterEach(() => {
  resetMockApi();
});

describe("usageStatus", () => {
  /** The prototype's own thresholds (`usageBar` 378), named rather than coloured. */
  it("maps a reading to the state its colour used to imply", () => {
    expect(usageStatus(42)).toBe("healthy");
    expect(usageStatus(70)).toBe("healthy");
    expect(usageStatus(71)).toBe("warning");
    expect(usageStatus(85)).toBe("warning");
    expect(usageStatus(86)).toBe("critical");
  });
});

describe("SystemMonitor", () => {
  it("shows the usage figures FR-OBS-04 asks for", async () => {
    installMockApi({ permissions: ["*"] });
    stubTelemetry();

    renderWithProviders(<SystemMonitor />);

    expect(await screen.findByText("39")).toBeInTheDocument();
    expect(screen.getByText("28")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  /** `logKpiCard` (452) — the prototype's first card on this screen. */
  it("shows the logbook activity figures above everything else", async () => {
    installMockApi({ permissions: ["*"] });
    stubTelemetry();

    renderWithProviders(<SystemMonitor />);

    expect(
      await screen.findByText("Logbook activity — this shift")
    ).toBeInTheDocument();
    expect(screen.getByText("486")).toBeInTheDocument();
    expect(screen.getByText("142")).toBeInTheDocument();
    expect(screen.getByText("of 190 provisioned")).toBeInTheDocument();
    expect(screen.getByText("88%")).toBeInTheDocument();
  });

  /**
   * **FR-OBS-04 names "peak concurrent users"** and the screen no longer shows
   * it — the prototype's fourth tile is New Registrations, and the owner asked
   * this screen to match the prototype.
   *
   * The figure stays on the contract, so this pins the *gap* rather than
   * pretending it is closed: if somebody later restores the tile, this test
   * fails and reminds them which requirement it was for.
   */
  it("shows New Registrations rather than FR-OBS-04's peak concurrent", async () => {
    installMockApi({ permissions: ["*"] });
    stubTelemetry();

    renderWithProviders(<SystemMonitor />);

    expect(await screen.findByText("New registrations")).toBeInTheDocument();
    expect(screen.getByText("+5")).toBeInTheDocument();
    expect(screen.queryByText("Peak concurrent")).not.toBeInTheDocument();
  });

  /**
   * The prototype's Auto-refresh switch (410).
   *
   * ⚠️ This used to assert only that the switch flipped — which is the Base UI
   * switch's own `useState` and nothing else. Deleting the `autoRefresh`
   * argument at the `useSystemMonitoring` call site left it green while the
   * chart carried on polling, so it verified the control's appearance rather
   * than its effect.
   *
   * It now checks the thing the switch is *for*: that the query stops refetching.
   * Fake timers rather than a real 60-second wait, and the request count is read
   * off the mock API's own log so the assertion is about traffic, not internals.
   */
  it("lets an Administrator stop the polling to read a number", async () => {
    /*
      `shouldAdvanceTime` so `userEvent` — which waits on real timers — still
      works while the clock is fake. Without it the click below never resolves.
    */
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      installMockApi({ permissions: ["*"] });
      stubTelemetry();

      renderWithProviders(<SystemMonitor />);

      const toggle = await screen.findByRole("switch", {
        name: "Auto-refresh",
      });
      expect(toggle).toBeChecked();
      expect(telemetryRequests()).toBeGreaterThan(0);

      /*
        The control group. Two intervals' worth of a *polling* query, so the
        assertion below is about the switch rather than about the clock never
        having advanced.
      */
      await act(async () => {
        await vi.advanceTimersByTimeAsync(150_000);
      });
      const whilePolling = telemetryRequests();
      expect(whilePolling).toBeGreaterThan(1);

      await userEvent.click(toggle);
      expect(toggle).not.toBeChecked();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(150_000);
      });

      expect(telemetryRequests()).toBe(whilePolling);
    } finally {
      vi.useRealTimers();
    }
  });

  /** FR-OBS-04's "history/trend" — and the first real use of `LineChart`. */
  it("plots the activity trend with an accessible equivalent", async () => {
    installMockApi({ permissions: ["*"] });
    stubTelemetry();

    renderWithProviders(<SystemMonitor />);

    expect(
      await screen.findByRole("img", {
        name: /Online users per hour over the last twelve hours/,
      })
    ).toBeInTheDocument();
    const table = screen.getByRole("table", {
      name: /Online users per hour over the last twelve hours/,
    });
    expect(within(table).getAllByRole("row").length).toBeGreaterThan(1);
  });

  it("reports each service's health as words, not only colour", async () => {
    installMockApi({ permissions: ["*"] });
    stubTelemetry();

    renderWithProviders(<SystemMonitor />);

    expect(await screen.findByText("Historian Sync")).toBeInTheDocument();
    // WCAG 1.4.1: the degraded state is spelled out beside the dot.
    expect(screen.getAllByText("Warning").length).toBeGreaterThan(0);
  });

  /**
   * A utilisation bar the prototype draws as two nested divs — invisible to
   * assistive technology. This is the element the platform already has.
   */
  it("exposes utilisation as a progressbar with its value", async () => {
    installMockApi({ permissions: ["*"] });
    stubTelemetry();

    renderWithProviders(<SystemMonitor />);

    const cpu = await screen.findByRole("progressbar", { name: "CPU usage" });
    expect(cpu).toHaveAttribute("aria-valuenow", "42");
    expect(cpu).toHaveAttribute("aria-valuemin", "0");
    expect(cpu).toHaveAttribute("aria-valuemax", "100");
  });

  it("rounds a fractional reading rather than emitting a fractional aria value", async () => {
    installMockApi({ permissions: ["*"] });
    stubTelemetry({ memory_percent: 63.6 });

    renderWithProviders(<SystemMonitor />);

    expect(
      await screen.findByRole("progressbar", { name: "Memory usage" })
    ).toHaveAttribute("aria-valuenow", "64");
  });

  /**
   * ⚠️ **This asserts the absence of a warning, which is not a good thing.**
   *
   * The screen used to carry an "Illustrative figures" banner saying no
   * telemetry service is connected. It was removed at the owner's request so
   * the screen matches the prototype, and this test is inverted rather than
   * deleted so the removal stays visible: every figure on this board is still
   * invented, and nothing on screen says so any more.
   *
   * If the banner is restored, delete this test rather than "fixing" it.
   */
  it("no longer warns that the figures are invented (owner decision)", async () => {
    installMockApi({ permissions: ["*"] });
    stubTelemetry();

    renderWithProviders(<SystemMonitor />);
    await screen.findByText("Logbook activity — this shift");

    expect(screen.queryByText(/Illustrative figures/)).not.toBeInTheDocument();
  });

  it("reports a failed load rather than an empty board", async () => {
    installMockApi({ permissions: ["*"] });
    mockRoute(
      "GET",
      /\/admin\/monitoring$/,
      () => ({
        success: false,
        error: { code: "forbidden", message: "Permission denied." },
      }),
      403
    );

    renderWithProviders(<SystemMonitor />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /telemetry could not be loaded/i
    );
  });
});

describe("Dashboard dispatch (§6.4)", () => {
  /** The prototype's own first line — `if (role === 'admin')` at 1135. */
  it("sends an Administrator to the system monitor, not the operations board", async () => {
    installMockApi({ roles: ["administrator"], permissions: ["*"] });
    stubTelemetry();

    renderWithProviders(<Dashboard />);

    expect(
      await screen.findByRole("heading", { name: "System monitoring" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Personalise" })
    ).not.toBeInTheDocument();
  });

  it("leaves every other role on the operations dashboard", async () => {
    installMockApi();
    mockRoute("GET", /\/shifts\/current$/, () =>
      envelope({
        shift_id: "20260731-D",
        label: "Day",
        starts_at: "2026-07-31T02:00:00+00:00",
        ends_at: "2026-07-31T14:00:00+00:00",
        overlap_minutes: 15,
      })
    );
    mockRoute("GET", /\/actions$/, () => paginatedEnvelope([]));
    mockRoute("GET", /\/summaries$/, () => paginatedEnvelope([]));
    mockRoute("GET", /\/dashboards\/widgets$/, () =>
      envelope({
        items: [
          {
            id: "WID-003",
            label: "Critical Alarms",
            type: "list",
            assigned_roles: ["operator"],
            enabled: true,
          },
        ],
      })
    );
    mockRoute("GET", /\/me\/dashboard-layout$/, () => envelope({ items: [] }));

    renderWithProviders(<Dashboard />);

    /*
      Asserted on the shift banner rather than the Personalise button. That
      button is Super User only in this build (an owner decision recorded beside
      `PersonaliseBar`), so an Operator never sees it — using it as the marker
      for "this is the operations dashboard" made the test fail for a reason
      that had nothing to do with dispatch.
    */
    /*
      The heading, not a loose `/Day shift/i`. The dashboard's subtitle now
      *also* names the shift — "Day shift · 31 Jul 2026", matching the
      prototype — so the old matcher found two elements and failed on strict
      mode rather than on dispatch. The `<h1>` is the unambiguous marker for
      "this is the operations dashboard", which is what the test is about.
    */
    expect(
      await screen.findByRole("heading", {
        name: "Operations Dashboard",
        level: 1,
      })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "System monitoring" })
    ).not.toBeInTheDocument();
  });
});
