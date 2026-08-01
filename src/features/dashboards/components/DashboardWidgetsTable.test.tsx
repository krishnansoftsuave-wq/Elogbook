import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { DashboardWidgetsTable } from "@/features/dashboards/components/DashboardWidgetsTable";
import {
  envelope,
  installMockApi,
  mockRoute,
  resetMockApi,
} from "@/test/mockApi";
import { renderWithProviders } from "@/test/utils";

const ADMIN_PERMISSIONS = ["*"];
/** §6.5 — dashboards, metrics, and comment / decision-workflow access. */
const SUPER_USER_PERMISSIONS = [
  "dashboard:configure",
  "widget:assign",
  "metric:control",
  "access:control",
  "user:read",
];
const OPERATOR_PERMISSIONS = [
  "shift:read",
  "summary:read",
  "assistant:query",
  "action:read",
  "action:write",
];

const widget = (
  overrides: Partial<{
    id: string;
    label: string;
    type: string;
    assigned_roles: string[];
    enabled: boolean;
  }> = {}
) => ({
  id: "WID-001",
  label: "Shift KPIs",
  type: "kpi",
  assigned_roles: ["operator", "supervisor"],
  enabled: true,
  ...overrides,
});

const stubWidgets = (items: readonly unknown[] = [widget()]) => {
  mockRoute("GET", /\/dashboards\/widgets$/, () => envelope({ items }));
};

afterEach(() => {
  resetMockApi();
});

describe("DashboardWidgetsTable", () => {
  it("renders each widget's label, type and assigned roles", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubWidgets();

    renderWithProviders(<DashboardWidgetsTable />);

    expect(await screen.findByText("Shift KPIs")).toBeVisible();
    expect(screen.getByText("KPI")).toBeVisible();
    expect(screen.getByRole("button", { name: "Operator" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Management" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  /**
   * The point of the whole screen: **FR-ADM-06** — the Super User "assign[s]
   * widgets to roles". Clicking an unassigned role chip must add it to the
   * existing assignment, not replace it.
   */
  it("adds a role to the assignment and keeps the existing ones", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });

    let sent: unknown;
    let items: readonly unknown[] = [widget()];
    mockRoute("GET", /\/dashboards\/widgets$/, () => envelope({ items }));
    mockRoute("PUT", /\/dashboards\/widgets\/WID-001$/, (config) => {
      sent = JSON.parse(String(config.data));
      items = [
        widget({ assigned_roles: ["operator", "supervisor", "management"] }),
      ];
      return envelope(items[0]);
    });

    renderWithProviders(<DashboardWidgetsTable />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Management" })
    );

    await waitFor(() =>
      expect(sent).toEqual({
        assigned_roles: ["operator", "supervisor", "management"],
        enabled: true,
      })
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Management" })
      ).toHaveAttribute("aria-pressed", "true")
    );
  });

  it("removes a role from the assignment", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });

    let sent: unknown;
    stubWidgets();
    mockRoute("PUT", /\/dashboards\/widgets\/WID-001$/, (config) => {
      sent = JSON.parse(String(config.data));
      return envelope(widget({ assigned_roles: ["supervisor"] }));
    });

    renderWithProviders(<DashboardWidgetsTable />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Operator" })
    );

    await waitFor(() =>
      expect(sent).toEqual({
        assigned_roles: ["supervisor"],
        enabled: true,
      })
    );
  });

  it("toggles the enabled switch, sending the current role assignment along with it", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });

    let sent: unknown;
    let items: readonly unknown[] = [widget({ enabled: false })];
    mockRoute("GET", /\/dashboards\/widgets$/, () => envelope({ items }));
    mockRoute("PUT", /\/dashboards\/widgets\/WID-001$/, (config) => {
      sent = JSON.parse(String(config.data));
      items = [widget({ enabled: true })];
      return envelope(items[0]);
    });

    renderWithProviders(<DashboardWidgetsTable />);

    await userEvent.click(
      await screen.findByRole("switch", { name: "Shift KPIs enabled" })
    );

    await waitFor(() =>
      expect(sent).toEqual({
        assigned_roles: ["operator", "supervisor"],
        enabled: true,
      })
    );
    await waitFor(() =>
      expect(
        screen.getByRole("switch", { name: "Shift KPIs enabled" })
      ).toBeChecked()
    );
  });

  /**
   * The UI half of **FR-ADM-03**. A Super User holds `dashboard:configure`
   * directly and may edit; an Administrator reaches it through the wildcard.
   */
  it("lets a Super User edit assignments", async () => {
    installMockApi({ permissions: SUPER_USER_PERMISSIONS });
    stubWidgets();

    renderWithProviders(<DashboardWidgetsTable />);

    expect(
      await screen.findByRole("button", { name: "Management" })
    ).not.toHaveAttribute("disabled");
    expect(
      screen.getByRole("switch", { name: "Shift KPIs enabled" })
    ).not.toHaveAttribute("aria-disabled", "true");
    expect(
      screen.queryByText(/Only a Super User or Administrator/)
    ).not.toBeInTheDocument();
  });

  /**
   * A role without `dashboard:configure` sees the controls **disabled and
   * explained**, not hidden — FR-ADM-03 is enforced by the route guard and the
   * `PUT` handler, not by pretending the screen does not exist.
   */
  it("disables editing, with an explanation, for a role without dashboard:configure", async () => {
    installMockApi({ permissions: OPERATOR_PERMISSIONS });
    stubWidgets();

    renderWithProviders(<DashboardWidgetsTable />);

    expect(
      await screen.findByRole("button", { name: "Management" })
    ).toBeDisabled();
    expect(
      screen.getByRole("switch", { name: "Shift KPIs enabled" })
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByText(/Only a Super User or Administrator/)
    ).toBeVisible();
  });

  /**
   * An error is not "no widgets configured" — same reasoning as
   * `WorkflowSettings`. Rendering an empty table would tell a Super User the
   * platform has nothing to assign, which is false.
   */
  it("says the catalog could not be loaded rather than showing an empty table", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    mockRoute("GET", /\/dashboards\/widgets$/, () => envelope(null), 500);

    renderWithProviders(<DashboardWidgetsTable />);

    // The shared client retries a read once with a ~1s backoff, so the error
    // state cannot appear inside the 1s default `findBy` window.
    expect(
      await screen.findByRole("alert", undefined, { timeout: 5000 })
    ).toHaveTextContent(/could not be loaded/);
    expect(screen.queryByText("Shift KPIs")).not.toBeInTheDocument();
  });
});
