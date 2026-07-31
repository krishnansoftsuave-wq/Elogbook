import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ActionDetail } from "@/features/actions/components/ActionDetail";
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

const ACTION = {
  id: "ACT-2041",
  title: "Relief valve XV-118 set-pressure verification",
  area: "B-train",
  equipment: "XV-118",
  priority: "critical",
  status: "open",
  source: "ai_suggested",
  category: "safety",
  description: "Confirm set pressure and check for passing.",
  due_at: "2099-01-01T12:00:00+00:00",
  created_at: "2026-01-01T12:00:00+00:00",
  created_by: ACTOR,
  owner: null,
};

const OPERATOR_PERMISSIONS = [
  "shift:read",
  "summary:read",
  "assistant:query",
  "action:read",
  "action:write",
];

/** Installs the detail + comments + workflow reads the screen makes. */
const stubScreen = ({
  workflows = [],
  action = ACTION,
}: {
  workflows?: { key: string; enabled: boolean; affects_role: string }[];
  action?: Record<string, unknown>;
} = {}) => {
  mockRoute("GET", /\/admin\/workflows$/, () => envelope({ items: workflows }));
  mockRoute("GET", /\/actions\/[^/]+\/comments$/, () => paginatedEnvelope([]));
  mockRoute("GET", /\/actions\/[^/]+$/, () => envelope(action));
};

const workflow = (key: string, enabled: boolean) => ({
  key,
  enabled,
  affects_role:
    key === "operator_comment_permission" ? "operator" : "supervisor",
});

afterEach(() => {
  resetMockApi();
});

describe("ActionDetail", () => {
  beforeEach(() => {
    installMockApi({ permissions: OPERATOR_PERMISSIONS });
  });

  it("renders the action's overview fields", async () => {
    stubScreen();
    renderWithProviders(<ActionDetail actionId="ACT-2041" />);

    expect(
      await screen.findByRole("heading", {
        name: "Relief valve XV-118 set-pressure verification",
      })
    ).toBeVisible();
    expect(screen.getByText("XV-118")).toBeVisible();
    expect(screen.getByText("Critical")).toBeVisible();
    expect(screen.getByText("Safety")).toBeVisible();
    expect(screen.getByText("AI Suggested")).toBeVisible();
  });

  /**
   * FR-PA-03 records an owner and FR-PA-05 gates assigning one, so an
   * unassigned action is the BRD's default state rather than missing data.
   */
  it("says an action is unassigned rather than showing a blank", async () => {
    stubScreen();
    renderWithProviders(<ActionDetail actionId="ACT-2041" />);

    expect(await screen.findByText("Unassigned")).toBeVisible();
  });

  it("offers a way back to the list", async () => {
    stubScreen();
    renderWithProviders(<ActionDetail actionId="ACT-2041" />);

    expect(
      await screen.findByRole("link", { name: /Back to list/ })
    ).toHaveAttribute("href", "/actions");
  });

  it("shows a recoverable empty state for an unknown id", async () => {
    mockRoute("GET", /\/admin\/workflows$/, () => envelope({ items: [] }));
    mockRoute("GET", /\/actions\/[^/]+\/comments$/, () =>
      paginatedEnvelope([])
    );
    mockRoute("GET", /\/actions\/[^/]+$/, () => envelope(null), 404);

    renderWithProviders(<ActionDetail actionId="ACT-0000" />);

    expect(
      await screen.findByRole("heading", { name: "Action not found" })
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: /Back to pending actions/ })
    ).toBeVisible();
  });
});

/* -------------------------------------------------------------------------- */
/* FR-PA-05 — the gate                                                         */
/* -------------------------------------------------------------------------- */

describe("ActionDetail — status control (FR-PA-05)", () => {
  afterEach(() => resetMockApi());

  /**
   * §6.2(a) is the labelled default: without the Administrator's workflow,
   * there is no assignment and no tracking. The control must not merely be
   * hidden — the user is told the capability is off, and by whom.
   */
  it("explains, rather than offering a control, while the workflow is off", async () => {
    installMockApi({ permissions: OPERATOR_PERMISSIONS });
    stubScreen({ workflows: [workflow("supervisor_action_workflow", false)] });

    renderWithProviders(<ActionDetail actionId="ACT-2041" />);

    expect(
      await screen.findByText(
        /Action tracking is turned off by your administrator/
      )
    ).toBeVisible();
    expect(
      screen.queryByLabelText("Change action status")
    ).not.toBeInTheDocument();
  });

  it("offers the control once an Administrator enables the workflow", async () => {
    installMockApi({ permissions: OPERATOR_PERMISSIONS });
    stubScreen({ workflows: [workflow("supervisor_action_workflow", true)] });

    renderWithProviders(<ActionDetail actionId="ACT-2041" />);

    expect(await screen.findByLabelText("Change action status")).toBeVisible();
  });

  /** Two independent conditions: the toggle AND `action:write`. */
  it("stays closed for a session without action:write, workflow on", async () => {
    installMockApi({ permissions: ["shift:read", "action:read"] });
    stubScreen({ workflows: [workflow("supervisor_action_workflow", true)] });

    renderWithProviders(<ActionDetail actionId="ACT-2041" />);

    expect(
      await screen.findByText("You have view-only access to this action.")
    ).toBeVisible();
    expect(
      screen.queryByLabelText("Change action status")
    ).not.toBeInTheDocument();
  });

  /** Fails closed while the toggle answer is still in flight. */
  it("does not flash a control open before the workflows load", () => {
    installMockApi({ permissions: OPERATOR_PERMISSIONS });
    stubScreen({ workflows: [workflow("supervisor_action_workflow", true)] });

    renderWithProviders(<ActionDetail actionId="ACT-2041" />);

    expect(
      screen.queryByLabelText("Change action status")
    ).not.toBeInTheDocument();
  });
});

/* -------------------------------------------------------------------------- */
/* FR-SUM-08 / §6.1 — comment access                                           */
/* -------------------------------------------------------------------------- */

describe("ActionDetail — commenting (FR-SUM-08)", () => {
  afterEach(() => resetMockApi());

  it("is view-only for an Operator until an Administrator grants access", async () => {
    installMockApi({ permissions: OPERATOR_PERMISSIONS });
    stubScreen({ workflows: [workflow("operator_comment_permission", false)] });

    renderWithProviders(<ActionDetail actionId="ACT-2041" />);

    expect(
      await screen.findByText(/Commenting is turned off by your administrator/)
    ).toBeVisible();
    expect(screen.queryByLabelText("Add a comment")).not.toBeInTheDocument();
  });

  it("opens for an Operator once the Administrator enables it", async () => {
    installMockApi({ permissions: OPERATOR_PERMISSIONS });
    stubScreen({ workflows: [workflow("operator_comment_permission", true)] });

    renderWithProviders(<ActionDetail actionId="ACT-2041" />);

    expect(await screen.findByLabelText("Add a comment")).toBeVisible();
  });

  /**
   * A Supervisor holds `summary:comment` outright, so the Administrator's
   * operator toggle does not govern them — the same permission-shaped question
   * the API asks. A role-shaped check got this wrong and failed open.
   */
  it("opens for a session holding summary:comment, toggle off", async () => {
    installMockApi({
      permissions: [...OPERATOR_PERMISSIONS, "summary:comment"],
    });
    stubScreen({ workflows: [workflow("operator_comment_permission", false)] });

    renderWithProviders(<ActionDetail actionId="ACT-2041" />);

    expect(await screen.findByLabelText("Add a comment")).toBeVisible();
  });

  it("shows the thread even when posting is refused", async () => {
    installMockApi({ permissions: OPERATOR_PERMISSIONS });
    mockRoute("GET", /\/admin\/workflows$/, () =>
      envelope({ items: [workflow("operator_comment_permission", false)] })
    );
    mockRoute("GET", /\/actions\/[^/]+\/comments$/, () =>
      paginatedEnvelope([
        {
          id: "ACM-001",
          action_id: "ACT-2041",
          author: ACTOR,
          body: "Isolation booked with panel.",
          created_at: "2026-07-31T06:00:00+00:00",
        },
      ])
    );
    mockRoute("GET", /\/actions\/[^/]+$/, () => envelope(ACTION));

    renderWithProviders(<ActionDetail actionId="ACT-2041" />);

    // Reading is never gated — only writing is.
    expect(
      await screen.findByText("Isolation booked with panel.")
    ).toBeVisible();
    expect(
      screen.getByText(/Commenting is turned off by your administrator/)
    ).toBeVisible();
  });
});
