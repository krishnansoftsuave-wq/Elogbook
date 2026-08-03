import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { isPlatformWidget } from "@/features/dashboards/widgetRegistry";
import {
  ActiveUsersCard,
  LogbookActivityCard,
  LogbookComplianceCard,
  SystemHealthCard,
} from "@/features/platform/components/PlatformCards";
import {
  adoptionPercent,
  platformOverviewWireSchema,
} from "@/features/platform/schemas";
import { seedPlatformOverview } from "@/mocks/data/platform";
import {
  envelope,
  installMockApi,
  mockRoute,
  resetMockApi,
} from "@/test/mockApi";
import { renderWithProviders } from "@/test/utils";

/**
 * The Super User dashboard's four cards — the prototype's `dashboard()` for
 * `role === 'superuser'` (app-source.txt 1133–1165).
 *
 * ⚠️ No BRD requirement covers them, so nothing here cites an `FR-` id. What
 * these tests pin is that the *screen* matches the prototype and that the
 * figures on it are the ones the payload carries — not that any of the figures
 * mean anything. `features/platform/schemas.ts` records the difference.
 */

const OVERVIEW = {
  audit_events_today: 486,
  active_users_24h: 142,
  provisioned_users: 190,
  custom_dashboards: 7,
  custom_dashboard_roles: 4,
  active_roles: 9,
  total_roles: 12,
  users_by_role: [
    { role: "operator", count: 24 },
    { role: "supervisor", count: 6 },
    { role: "management", count: 3 },
    { role: "administrator", count: 2 },
  ],
  services: [
    { name: "AD FS / SAML", status: "healthy" },
    { name: "AI service", status: "healthy" },
    { name: "Historian sync", status: "warning" },
  ],
  last_backup_at: "2026-06-24T02:00:00+04:00",
  compliance_percent: 96,
};

const stubOverview = (overrides: Record<string, unknown> = {}) => {
  mockRoute("GET", /\/platform-overview$/, () =>
    envelope({ ...OVERVIEW, ...overrides })
  );
};

beforeEach(() => {
  installMockApi({
    roles: ["super_user"],
    permissions: ["dashboard:configure", "user:read"],
  });
});

afterEach(() => {
  resetMockApi();
});

describe("Logbook activity — this shift", () => {
  it("shows the prototype's four figures", async () => {
    stubOverview();

    renderWithProviders(<LogbookActivityCard />);

    expect(await screen.findByText("486")).toBeVisible();
    expect(screen.getByText("142")).toBeVisible();
    expect(screen.getByText("7")).toBeVisible();
    expect(screen.getByText("9 / 12")).toBeVisible();
  });

  /**
   * The prototype hardcodes "of 190 · 75%" beside a 142, so the two halves can
   * disagree the moment either changes. Here the percentage is derived.
   */
  it("derives the adoption percentage from the two figures beside it", async () => {
    stubOverview({ active_users_24h: 50, provisioned_users: 200 });

    renderWithProviders(<LogbookActivityCard />);

    expect(await screen.findByText("of 200 · 25%")).toBeVisible();
  });

  /** A ratio with no denominator is not 0% — the clause is dropped, not faked. */
  it("prints no percentage when nobody is provisioned", async () => {
    stubOverview({ active_users_24h: 0, provisioned_users: 0 });

    renderWithProviders(<LogbookActivityCard />);

    expect(await screen.findByText("of 0")).toBeVisible();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });
});

describe("Active users", () => {
  /** "Operators", not "Operator" — the prototype's own row labels. */
  it("lists a headcount per role, pluralised", async () => {
    stubOverview();

    renderWithProviders(<ActiveUsersCard />);

    const list = await screen.findByRole("list");
    expect(within(list).getByText("Operators")).toBeVisible();
    expect(within(list).getByText("Supervisors")).toBeVisible();
    expect(within(list).getByText("Administrators")).toBeVisible();
    expect(within(list).getByText("24")).toBeVisible();
  });
});

describe("System health", () => {
  it("names each service and its state in words, not only colour", async () => {
    stubOverview();

    renderWithProviders(<SystemHealthCard />);

    expect(await screen.findByText("AD FS / SAML")).toBeVisible();
    // WCAG 1.4.1: the dot repeats the word, it does not replace it.
    expect(screen.getByText("Warning")).toBeVisible();
    expect(screen.getAllByText("Healthy")).toHaveLength(2);
  });

  /**
   * The prototype prints a bare `'02:00'`. A time with no zone is ambiguous on
   * a screen a viewer may open from anywhere, and every other timestamp in this
   * product is plant-local (`lib/datetime.ts`).
   */
  it("renders the backup time in plant time", async () => {
    stubOverview();

    renderWithProviders(<SystemHealthCard />);

    expect(await screen.findByText("02:00 GST")).toBeVisible();
  });
});

describe("Logbook compliance", () => {
  /**
   * A percentage drawn as a width is invisible to assistive technology — the
   * same reason `UsageBar` is a progressbar rather than two nested divs.
   */
  it("exposes the meter as a progressbar with its value", async () => {
    stubOverview();

    renderWithProviders(<LogbookComplianceCard />);

    const meter = await screen.findByRole("progressbar", {
      name: "Entries signed on time",
    });
    expect(meter).toHaveAttribute("aria-valuenow", "96");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
  });
});

describe("platform card failures", () => {
  /**
   * A 4xx rather than a 500: `retryUnlessClientError` retries a server error,
   * so a 500 leaves the card in its skeleton for the length of the backoff and
   * the test would be asserting on the retry policy rather than the error
   * state.
   */
  it("says the overview could not be loaded rather than drawing zeroes", async () => {
    mockRoute(
      "GET",
      /\/platform-overview$/,
      () => ({
        success: false,
        error: { code: "forbidden", message: "Permission denied." },
      }),
      403
    );

    renderWithProviders(<SystemHealthCard />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Platform overview could not be loaded/
    );
  });
});

describe("adoptionPercent", () => {
  it("rounds to whole percentage points", () => {
    expect(adoptionPercent(142, 190)).toBe(75);
  });

  it("returns null rather than dividing by zero", () => {
    expect(adoptionPercent(0, 0)).toBeNull();
  });
});

/**
 * The seed and the schema drift apart silently otherwise: the route returns the
 * seed unparsed, so a renamed field would only surface as a blank card in a
 * browser.
 */
describe("the platform seed", () => {
  it("satisfies the contract the client parses", () => {
    expect(() =>
      platformOverviewWireSchema.parse(seedPlatformOverview())
    ).not.toThrow();
  });
});

/**
 * The marker that records which widgets are fabricated. Nothing renders from it
 * today — the owner had the "Sample data" banner removed — so a test is the
 * only thing keeping it honest, exactly as `PlantOpsCards.test.tsx` does for
 * `isIllustrativeWidget`.
 */
describe("isPlatformWidget", () => {
  it("marks the three Super User widgets", () => {
    for (const id of ["WID-014", "WID-015", "WID-016"]) {
      expect(isPlatformWidget(id)).toBe(true);
    }
  });

  it("marks nothing else", () => {
    for (const id of ["WID-001", "WID-008", "WID-013"]) {
      expect(isPlatformWidget(id)).toBe(false);
    }
  });
});
