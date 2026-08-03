import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { Dashboard } from "@/features/home/components/Dashboard";
import { applyLayout } from "@/features/dashboards/schemas";
import {
  envelope,
  installMockApi,
  mockRoute,
  paginatedEnvelope,
  resetMockApi,
} from "@/test/mockApi";
import { renderWithProviders } from "@/test/utils";

/**
 * **FR-DASH-04** — "hide widgets, resize/expand widgets, save a preferred
 * layout, focus on role-relevant widgets" — and **FR-DASH-05**, which requires
 * that none of it reaches anybody else.
 */

/**
 * Personalisation is Super User only in this build — an owner decision that
 * departs from FR-DASH-04's "All roles", recorded beside `PersonaliseBar`.
 * These tests therefore sign in as one; were they left on the default Operator
 * they would fail for the right reason and read as a broken feature.
 */
const SUPER_USER = {
  roles: ["super_user"],
  permissions: ["dashboard:configure", "user:read"],
};

const widget = (id: string, label: string, type = "list") => ({
  id,
  label,
  type,
  assigned_roles: ["operator", "supervisor", "management"],
  enabled: true,
});

/**
 * The **Super User's** widget set, because that is the only role that can
 * personalise (see the note beside `PersonaliseBar`).
 *
 * `useRoleWidgets` gives that role a fixed list — `SUPER_USER_WIDGET_IDS`:
 * WID-001, 014, 015, 016 — rather than reading the assignment table, since
 * FR-DASH-01's config screen has no Super User column. A fixture of
 * operator-assigned widgets therefore rendered nothing for this role, and every
 * case here failed looking for a card that was never going to appear.
 *
 * `assigned_roles` is left as the operational three deliberately: it is ignored
 * for this role, and matching the real seed keeps the fixture honest about
 * where the set actually comes from.
 */
const WIDGETS = [
  widget("WID-001", "Shift KPIs", "kpi"),
  widget("WID-014", "Active Users"),
  widget("WID-015", "System Health"),
  widget("WID-016", "Logbook Compliance"),
];

/**
 * The three Super User cards read `/platform-overview`. Unstubbed, `installMockApi`
 * rejects the request loudly and the cards render their error state — which
 * looks like a personalisation bug rather than a missing stub.
 */
const PLATFORM_OVERVIEW = {
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
  ],
  services: [{ name: "AD FS / SAML", status: "healthy" }],
  last_backup_at: "2026-08-01T02:00:00+00:00",
  compliance_percent: 96,
};

/** Captures what the layout endpoint was last sent. */
let savedLayout: unknown;

const stub = (layout: readonly unknown[] = []) => {
  let current = layout;
  savedLayout = undefined;

  mockRoute("GET", /\/shifts\/current$/, () =>
    envelope({
      shift_id: "20260731-D",
      label: "Day",
      starts_at: "2026-07-31T02:00:00+00:00",
      ends_at: "2026-07-31T14:00:00+00:00",
      overlap_minutes: 15,
    })
  );
  // WID-001's tiles. No summaries stub: the Super User's set has no card that
  // reads one, and a fixture nothing asserts on invites the next reader to
  // think it matters.
  mockRoute("GET", /\/actions$/, () => paginatedEnvelope([]));
  mockRoute("GET", /\/platform-overview$/, () => envelope(PLATFORM_OVERVIEW));
  mockRoute("GET", /\/dashboards\/widgets$/, () =>
    envelope({ items: WIDGETS })
  );
  mockRoute("GET", /\/me\/dashboard-layout$/, () =>
    envelope({ items: current })
  );
  mockRoute("PUT", /\/me\/dashboard-layout$/, (config) => {
    const body = JSON.parse(String(config.data));
    savedLayout = body.items;
    current = body.items;
    return envelope({ items: body.items });
  });
};

const enterPersonalise = async () => {
  await userEvent.click(
    await screen.findByRole("button", { name: "Personalise" })
  );
};

afterEach(() => {
  resetMockApi();
});

describe("applyLayout", () => {
  const widgets = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("orders widgets by the saved layout", () => {
    const result = applyLayout(widgets, [
      { widgetId: "c", hidden: false, wide: false },
      { widgetId: "a", hidden: false, wide: false },
    ]);

    expect(result.map((item) => item.widget.id)).toEqual(["c", "a", "b"]);
  });

  /**
   * FR-DASH-05 in the direction that matters: a Super User revoking a widget
   * removes it from everybody, including users whose layout still names it.
   */
  it("ignores a layout entry for a widget the role no longer has", () => {
    const result = applyLayout(widgets, [
      { widgetId: "gone", hidden: false, wide: true },
      { widgetId: "b", hidden: false, wide: false },
    ]);

    expect(result.map((item) => item.widget.id)).toEqual(["b", "a", "c"]);
  });

  /** A newly assigned widget must appear, not vanish into an older layout. */
  it("appends widgets the layout says nothing about", () => {
    const result = applyLayout(widgets, [
      { widgetId: "b", hidden: true, wide: false },
    ]);

    expect(result.map((item) => item.widget.id)).toEqual(["b", "a", "c"]);
    expect(result[0]?.hidden).toBe(true);
    expect(result[1]?.hidden).toBe(false);
  });

  it("uses the default width only for widgets with no entry", () => {
    const result = applyLayout(
      widgets,
      [{ widgetId: "a", hidden: false, wide: false }],
      (id) => id === "a" || id === "b"
    );

    // `a` has an entry saying narrow — the default must not override it.
    expect(result.find((item) => item.widget.id === "a")?.wide).toBe(false);
    expect(result.find((item) => item.widget.id === "b")?.wide).toBe(true);
    expect(result.find((item) => item.widget.id === "c")?.wide).toBe(false);
  });

  it("tolerates a duplicated entry rather than rendering the widget twice", () => {
    const result = applyLayout(widgets, [
      { widgetId: "a", hidden: false, wide: false },
      { widgetId: "a", hidden: true, wide: true },
    ]);

    expect(result.filter((item) => item.widget.id === "a")).toHaveLength(1);
  });
});

describe("Dashboard personalisation (FR-DASH-04)", () => {
  it("offers no controls until personalise mode is entered", async () => {
    installMockApi(SUPER_USER);
    stub();

    renderWithProviders(<Dashboard />);

    expect(
      await screen.findByRole("button", { name: "Personalise" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Hide Active Users/ })
    ).not.toBeInTheDocument();
  });

  it("hides a widget and persists the whole arrangement", async () => {
    installMockApi(SUPER_USER);
    stub();

    renderWithProviders(<Dashboard />);
    await enterPersonalise();

    await userEvent.click(
      screen.getByRole("button", { name: "Hide Active Users" })
    );

    await waitFor(() => {
      expect(savedLayout).toEqual([
        { widget_id: "WID-001", hidden: false, wide: true },
        { widget_id: "WID-014", hidden: true, wide: false },
        { widget_id: "WID-015", hidden: false, wide: false },
        { widget_id: "WID-016", hidden: false, wide: false },
      ]);
    });
  });

  /** A hidden widget stays visible-but-dimmed while personalising, so it can be restored. */
  it("keeps a hidden widget on screen while personalising, and drops it after", async () => {
    installMockApi(SUPER_USER);
    stub([
      { widget_id: "WID-014", hidden: true, wide: false },
      { widget_id: "WID-015", hidden: false, wide: false },
    ]);

    renderWithProviders(<Dashboard />);
    await enterPersonalise();

    expect(
      screen.getByRole("button", { name: "Show Active Users" })
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Done" }));

    // "Operators" is a row only the Active Users card draws.
    expect(screen.queryByText("Operators")).not.toBeInTheDocument();
  });

  it("expands a widget across both columns", async () => {
    installMockApi(SUPER_USER);
    stub();

    renderWithProviders(<Dashboard />);
    await enterPersonalise();

    await userEvent.click(
      screen.getByRole("button", { name: "Expand Active Users" })
    );

    await waitFor(() => {
      expect(savedLayout).toContainEqual({
        widget_id: "WID-014",
        hidden: false,
        wide: true,
      });
    });
  });

  /**
   * ⚠️ Rewritten when the ⌃ / ⌄ buttons were removed to match the prototype,
   * whose card header carries only hide, expand and a grip.
   *
   * The gesture moved onto the grip rather than disappearing: HTML5 drag has no
   * keyboard equivalent, so deleting the buttons without this would have taken
   * FR-DASH-04's reordering away from every keyboard and switch user (WCAG
   * 2.1.1). This test is what stops that regression being silent.
   */
  it("reorders from the grip with the arrow keys, and does nothing at the ends", async () => {
    installMockApi(SUPER_USER);
    stub();

    renderWithProviders(<Dashboard />);
    await enterPersonalise();

    // Already first — ArrowUp must not move it or write anything.
    screen.getByRole("button", { name: "Reorder Shift KPIs" }).focus();
    await userEvent.keyboard("{ArrowUp}");
    expect(savedLayout).toBeUndefined();

    const grip = screen.getByRole("button", { name: "Reorder Active Users" });
    grip.focus();
    await userEvent.keyboard("{ArrowUp}");

    await waitFor(() => {
      expect(
        (savedLayout as { widget_id: string }[]).map((item) => item.widget_id)
      ).toEqual(["WID-014", "WID-001", "WID-015", "WID-016"]);
    });
  });

  /** The prototype's buttons, and only those — no ⌃ / ⌄ survives. */
  it("offers no separate move buttons", async () => {
    installMockApi(SUPER_USER);
    stub();

    renderWithProviders(<Dashboard />);
    await enterPersonalise();

    expect(
      screen.queryByRole("button", { name: /^Move / })
    ).not.toBeInTheDocument();
  });

  /**
   * An empty array, not the defaults written out — "never personalised" keeps
   * following the role's standard order as a Super User changes it.
   */
  it("resets by clearing the layout rather than writing the defaults", async () => {
    installMockApi(SUPER_USER);
    stub([{ widget_id: "WID-014", hidden: true, wide: false }]);

    renderWithProviders(<Dashboard />);
    await enterPersonalise();

    await userEvent.click(
      screen.getByRole("button", { name: /Reset to default/ })
    );

    await waitFor(() => {
      expect(savedLayout).toEqual([]);
    });
  });

  it("offers nothing to reset before anything has been personalised", async () => {
    installMockApi(SUPER_USER);
    stub();

    renderWithProviders(<Dashboard />);
    await enterPersonalise();

    expect(
      screen.getByRole("button", { name: /Reset to default/ })
    ).toBeDisabled();
  });

  /**
   * Every control is a real button — including the grip.
   *
   * Cards are draggable in personalise mode, but native HTML5 drag is **not
   * keyboard-operable**: there is no key sequence that produces a `dragstart`.
   * The grip is therefore the only keyboard route to reordering, which is why
   * it became a focusable button when the ⌃ / ⌄ pair was removed rather than
   * staying the `aria-hidden` ornament it had been.
   */
  it("exposes every personalisation control to the keyboard", async () => {
    installMockApi(SUPER_USER);
    stub();

    renderWithProviders(<Dashboard />);
    await enterPersonalise();

    for (const name of [
      "Reorder Active Users",
      "Expand Active Users",
      "Hide Active Users",
    ]) {
      const control = screen.getByRole("button", { name });
      expect(control).toHaveAttribute("type", "button");
      control.focus();
      expect(control).toHaveFocus();
    }
  });
});
