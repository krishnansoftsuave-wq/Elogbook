import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { WorkflowSettings } from "@/features/admin/components/WorkflowSettings";
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

const workflow = (
  key: string,
  enabled: boolean,
  affectsRole = "supervisor"
) => ({ key, enabled, affects_role: affectsRole });

const ALL_OFF = [
  workflow("operator_comment_permission", false, "operator"),
  workflow("supervisor_action_workflow", false, "supervisor"),
  workflow("management_decision_workflow", false, "management"),
  workflow("predictive_insights", false, "management"),
];

const stubWorkflows = (items: readonly unknown[] = ALL_OFF) => {
  mockRoute("GET", /\/admin\/workflows$/, () => envelope({ items }));
};

afterEach(() => {
  resetMockApi();
});

describe("WorkflowSettings", () => {
  it("renders all four switches, off, with the prototype's copy", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubWorkflows();

    renderWithProviders(<WorkflowSettings />);

    expect(
      await screen.findByRole("switch", { name: "Supervisor Action Workflow" })
    ).not.toBeChecked();
    expect(
      screen.getByRole("switch", { name: "Operator Comment Permission" })
    ).not.toBeChecked();
    expect(
      screen.getByRole("switch", { name: "Management Decision Workflow" })
    ).not.toBeChecked();
    expect(
      screen.getByRole("switch", { name: "Predictive Insights" })
    ).not.toBeChecked();
  });

  /**
   * The point of the whole screen: **FR-PA-05** says assignment and tracking
   * exist "only when the Administrator enables the workflow", and until this
   * hook existed nothing in the app could enable one.
   */
  it("sends the switch's key and its new position, then shows it enabled", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });

    let sent: unknown;
    let items = ALL_OFF;
    mockRoute("GET", /\/admin\/workflows$/, () => envelope({ items }));
    mockRoute("PATCH", /\/admin\/workflows$/, (config) => {
      sent = JSON.parse(String(config.data));
      items = ALL_OFF.map((item) =>
        item.key === "supervisor_action_workflow"
          ? { ...item, enabled: true }
          : item
      );
      return envelope(workflow("supervisor_action_workflow", true));
    });

    renderWithProviders(<WorkflowSettings />);

    await userEvent.click(
      await screen.findByRole("switch", { name: "Supervisor Action Workflow" })
    );

    await waitFor(() =>
      expect(sent).toEqual({
        key: "supervisor_action_workflow",
        enabled: true,
      })
    );
    await waitFor(() =>
      expect(
        screen.getByRole("switch", { name: "Supervisor Action Workflow" })
      ).toBeChecked()
    );
  });

  it("turns one back off — the switch is not one-way", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });

    let sent: unknown;
    stubWorkflows([
      workflow("operator_comment_permission", true, "operator"),
      ...ALL_OFF.slice(1),
    ]);
    mockRoute("PATCH", /\/admin\/workflows$/, (config) => {
      sent = JSON.parse(String(config.data));
      return envelope(workflow("operator_comment_permission", false));
    });

    renderWithProviders(<WorkflowSettings />);

    await userEvent.click(
      await screen.findByRole("switch", { name: "Operator Comment Permission" })
    );

    await waitFor(() =>
      expect(sent).toEqual({
        key: "operator_comment_permission",
        enabled: false,
      })
    );
  });

  /**
   * The UI half of **FR-ADM-03**, and it is **per switch**.
   *
   * §6.5's fourth bullet, the §4 role table, **FR-ADM-06** and **FR-DASH-03**
   * all give the Super User control of *"access to comments and the decision
   * workflow"*; **FR-PA-05** reserves action assignment to the *"Administrator"*.
   * An earlier build disabled all four for them, on the strength of §6.5's
   * *fifth* bullet ("Can view users") — which is a different sentence.
   */
  it("leaves a Super User the two switches the BRD grants them", async () => {
    installMockApi({ permissions: SUPER_USER_PERMISSIONS });
    stubWorkflows();

    renderWithProviders(<WorkflowSettings />);

    /*
      `aria-disabled`, not `toBeDisabled()`. Base UI renders a
      `<span role="switch">` rather than a `<button>`, so there is no native
      `disabled` attribute to assert on — it sets `aria-disabled="true"`,
      `data-disabled` and `tabindex="-1"` instead. `toBeDisabled()` only
      recognises natively-disableable elements and fails here even though the
      control genuinely is inert.
    */
    const live = [
      "Operator Comment Permission",
      "Management Decision Workflow",
    ];
    for (const name of live) {
      expect(await screen.findByRole("switch", { name })).not.toHaveAttribute(
        "aria-disabled",
        "true"
      );
    }

    for (const name of ["Supervisor Action Workflow", "Predictive Insights"]) {
      expect(screen.getByRole("switch", { name })).toHaveAttribute(
        "aria-disabled",
        "true"
      );
    }

    // The inert ones say why, rather than sitting there looking broken.
    expect(
      screen.getAllByText("Only an Administrator can change this one.")
    ).toHaveLength(2);
  });

  it("leaves an Administrator all four live", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubWorkflows();

    renderWithProviders(<WorkflowSettings />);

    const switches = await screen.findAllByRole("switch");
    expect(switches).toHaveLength(4);
    for (const control of switches) {
      expect(control).not.toHaveAttribute("aria-disabled", "true");
    }
    expect(
      screen.queryByText("Only an Administrator can change this one.")
    ).not.toBeInTheDocument();
  });

  /**
   * An error is not "no switches configured". Rendering an empty list would tell
   * an Administrator the platform has no workflow controls — false, and the kind
   * of claim that stops somebody looking further.
   */
  it("says the settings could not be loaded rather than showing none", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    mockRoute("GET", /\/admin\/workflows$/, () => envelope(null), 500);

    renderWithProviders(<WorkflowSettings />);

    // The shared client retries a read once with a ~1s backoff, so the error
    // state cannot appear inside the 1s default `findBy` window.
    expect(
      await screen.findByRole("alert", undefined, { timeout: 5000 })
    ).toHaveTextContent(/could not be loaded/);
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  /**
   * `predictive_insights` has no requirement behind it and nothing in the app
   * reads it; `management_decision_workflow` is enforced by the decisions API but
   * has no screen yet. Saying so on the card is the difference between an
   * Administrator knowing the switch does nothing today and assuming it works.
   */
  it("says which switches do not yet change anything visible", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubWorkflows();

    renderWithProviders(<WorkflowSettings />);

    expect(
      await screen.findByText(/Nothing reads this switch yet/)
    ).toBeVisible();
    expect(
      screen.getByText(/Management screens that would show the difference/)
    ).toBeVisible();
  });
});
