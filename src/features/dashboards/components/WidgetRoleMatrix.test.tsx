import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import {
  nextRolesFor,
  WidgetRoleMatrix,
} from "@/features/dashboards/components/WidgetRoleMatrix";
import type { DashboardWidget } from "@/features/dashboards/schemas";
import {
  envelope,
  installMockApi,
  mockRoute,
  resetMockApi,
} from "@/test/mockApi";
import { renderWithProviders } from "@/test/utils";

/** §6.5 — the role FR-DASH-02 names for this screen. */
const SUPER_USER_PERMISSIONS = [
  "dashboard:configure",
  "widget:assign",
  "metric:control",
  "access:control",
  "user:read",
];

/** Holds `dashboard:configure` only through the wildcard — FR-ADM-07. */
const ADMIN_PERMISSIONS = ["*"];

/** An operational role: may reach neither the write nor, normally, the screen. */
const OPERATOR_PERMISSIONS = ["shift:read", "action:read"];

const widget = (
  id: string,
  label: string,
  assignedRoles: readonly string[],
  enabled = true,
  type = "kpi"
) => ({
  id,
  label,
  type,
  assigned_roles: assignedRoles,
  enabled,
});

const LIBRARY = [
  widget("WID-001", "Shift KPIs", ["operator", "supervisor", "management"]),
  widget("WID-002", "Current Shift Highlights", ["operator"], true, "list"),
  widget("WID-005", "Repeating Issues", ["management"], false, "list"),
];

const stubLibrary = (items: readonly unknown[] = LIBRARY) => {
  mockRoute("GET", /\/dashboards\/widgets$/, () => envelope({ items }));
};

afterEach(() => {
  resetMockApi();
});

describe("nextRolesFor", () => {
  const base: DashboardWidget = {
    id: "WID-001",
    label: "Shift KPIs",
    type: "kpi",
    assignedRoles: ["operator", "supervisor"],
    enabled: true,
  };

  it("adds a role without disturbing the others", () => {
    expect(nextRolesFor(base, "management", true)).toEqual([
      "operator",
      "supervisor",
      "management",
    ]);
  });

  it("removes a role without disturbing the others", () => {
    expect(nextRolesFor(base, "operator", false)).toEqual(["supervisor"]);
  });

  /**
   * The data-loss guard. `PUT` replaces the whole array and this table renders
   * only three of five roles, so rebuilding the array from the visible switches
   * alone would silently drop an assignment nothing on screen could reveal.
   */
  it("preserves roles the table does not render", () => {
    const withHidden: DashboardWidget = {
      ...base,
      assignedRoles: ["operator", "administrator", "super_user"],
    };

    const next = nextRolesFor(withHidden, "supervisor", true);
    expect(next).toContain("administrator");
    expect(next).toContain("super_user");
    expect(next).toContain("operator");
    expect(next).toContain("supervisor");
  });

  it("preserves hidden roles when removing a visible one too", () => {
    const withHidden: DashboardWidget = {
      ...base,
      assignedRoles: ["operator", "administrator"],
    };

    expect(nextRolesFor(withHidden, "operator", false)).toEqual([
      "administrator",
    ]);
  });
});

describe("WidgetRoleMatrix", () => {
  it("renders a switch per widget per configurable role, reflecting assignment", async () => {
    installMockApi({ permissions: SUPER_USER_PERMISSIONS });
    stubLibrary();

    renderWithProviders(<WidgetRoleMatrix />);

    expect(
      await screen.findByRole("switch", {
        name: "Shift KPIs — show to Operator",
      })
    ).toBeChecked();
    expect(
      screen.getByRole("switch", {
        name: "Current Shift Highlights — show to Management",
      })
    ).not.toBeChecked();
  });

  /**
   * **FR-DASH-01** names three roles. Administrator and Super User have their
   * own dashboards and must not appear as assignable columns.
   */
  it("offers only the three roles FR-DASH-01 names", async () => {
    installMockApi({ permissions: SUPER_USER_PERMISSIONS });
    stubLibrary();

    renderWithProviders(<WidgetRoleMatrix />);
    await screen.findByRole("switch", {
      name: "Shift KPIs — show to Operator",
    });

    expect(
      screen.getByRole("columnheader", { name: "Operator" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Administrator" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Super User" })
    ).not.toBeInTheDocument();
  });

  /** FR-DASH-02 / FR-ADM-06 — the write this screen exists for. */
  it("sends the full new assignment on toggle", async () => {
    installMockApi({ permissions: SUPER_USER_PERMISSIONS });

    let sent: unknown;
    let items: readonly unknown[] = LIBRARY;
    mockRoute("GET", /\/dashboards\/widgets$/, () => envelope({ items }));
    mockRoute("PUT", /\/dashboards\/widgets\/WID-002$/, (config) => {
      sent = JSON.parse(String(config.data));
      items = LIBRARY.map((item) =>
        item.id === "WID-002"
          ? { ...item, assigned_roles: ["operator", "supervisor"] }
          : item
      );
      return envelope({
        ...widget(
          "WID-002",
          "Current Shift Highlights",
          ["operator", "supervisor"],
          true,
          "list"
        ),
      });
    });

    renderWithProviders(<WidgetRoleMatrix />);

    await userEvent.click(
      await screen.findByRole("switch", {
        name: "Current Shift Highlights — show to Supervisor",
      })
    );

    await waitFor(() => {
      expect(sent).toEqual({
        assigned_roles: ["operator", "supervisor"],
        enabled: true,
      });
    });
  });

  /** FR-DASH-02's "control which metrics each role can see" — the off switch. */
  it("sends the unchanged assignment when only publication is toggled", async () => {
    installMockApi({ permissions: SUPER_USER_PERMISSIONS });

    let sent: unknown;
    stubLibrary();
    mockRoute("PUT", /\/dashboards\/widgets\/WID-005$/, (config) => {
      sent = JSON.parse(String(config.data));
      return envelope(
        widget("WID-005", "Repeating Issues", ["management"], true, "list")
      );
    });

    renderWithProviders(<WidgetRoleMatrix />);

    await userEvent.click(
      await screen.findByRole("switch", {
        name: "Repeating Issues — published",
      })
    );

    await waitFor(() => {
      expect(sent).toEqual({
        assigned_roles: ["management"],
        enabled: true,
      });
    });
  });

  it("lets an Administrator edit through the wildcard (FR-ADM-07)", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubLibrary();

    renderWithProviders(<WidgetRoleMatrix />);

    expect(
      await screen.findByRole("switch", {
        name: "Shift KPIs — show to Operator",
      })
    ).not.toBeDisabled();
  });

  /**
   * A custom role (FR-ADM-02) could hold a combination that reaches the screen
   * without the write. The right outcome is a readable read-only table, not a
   * page of controls that all 403.
   */
  it("shows a read-only table, explained, without dashboard:configure", async () => {
    installMockApi({ permissions: OPERATOR_PERMISSIONS });
    stubLibrary();

    renderWithProviders(<WidgetRoleMatrix />);

    const toggle = await screen.findByRole("switch", {
      name: "Shift KPIs — show to Operator",
    });
    // Base UI renders a `<span role="switch">`, so `disabled` surfaces as
    // `aria-disabled` rather than the native attribute.
    expect(toggle).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByText(/can view this configuration but not change it/i)
    ).toBeInTheDocument();
  });

  /** An error is not "no widgets configured" — the distinction matters here. */
  it("reports a failed load rather than rendering an empty library", async () => {
    installMockApi({ permissions: SUPER_USER_PERMISSIONS });
    // A 403 rather than a 500: `retryUnlessClientError` retries a server error,
    // so a 5xx would leave the query in flight rather than settled — and a
    // session that reached the screen without the API's blessing is the
    // realistic failure here anyway.
    mockRoute(
      "GET",
      /\/dashboards\/widgets$/,
      () => ({
        success: false,
        error: { code: "forbidden", message: "Permission denied." },
      }),
      403
    );

    renderWithProviders(<WidgetRoleMatrix />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /widget library could not be loaded/i
    );
  });

  it("distinguishes a genuinely empty library from a failure", async () => {
    installMockApi({ permissions: SUPER_USER_PERMISSIONS });
    stubLibrary([]);

    renderWithProviders(<WidgetRoleMatrix />);

    expect(
      await screen.findByText(/no widgets are defined/i)
    ).toBeInTheDocument();
  });
});
