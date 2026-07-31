import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ActionOwnerControl } from "@/features/actions/components/ActionOwnerControl";
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

const stubWorkflow = (enabled: boolean) => {
  mockRoute("GET", /\/admin\/workflows$/, () =>
    envelope({
      items: [
        {
          key: "supervisor_action_workflow",
          enabled,
          affects_role: "supervisor",
        },
      ],
    })
  );
};

const stubActions = () => {
  mockRoute("GET", /\/actions$/, () => paginatedEnvelope([action()]));
};

const SUPERVISOR_PERMISSIONS = [
  "shift:read",
  "summary:read",
  "action:read",
  "action:write",
  "action:confirm",
  "action:assign",
];

const OPERATOR_PERMISSIONS = [
  "shift:read",
  "summary:read",
  "action:read",
  "action:write",
];

afterEach(() => {
  resetMockApi();
});

describe("ActionOwnerControl", () => {
  /**
   * The two gates answer different questions — *may this person assign* and *is
   * assignment switched on at all* — so all four combinations are pinned. The
   * API enforces the same pair (FR-ADM-03); this is only the UI half.
   */
  describe("FR-PA-05's two gates", () => {
    beforeEach(() => {
      stubActions();
    });

    it("offers the control with the permission and the workflow on", async () => {
      installMockApi({ permissions: SUPERVISOR_PERMISSIONS });
      stubWorkflow(true);

      renderWithProviders(
        <ActionOwnerControl actionId="ACT-2041" owner={null} />
      );

      expect(
        await screen.findByLabelText("Assign an owner")
      ).toBeInTheDocument();
    });

    /** The seeded default. §6.2(a) calls it "the default", not a failure. */
    it("explains the workflow is off rather than disabling a dropdown", async () => {
      installMockApi({ permissions: SUPERVISOR_PERMISSIONS });
      stubWorkflow(false);

      renderWithProviders(
        <ActionOwnerControl actionId="ACT-2041" owner={null} />
      );

      expect(
        await screen.findByText(
          /Assignment is turned off by your administrator/
        )
      ).toBeVisible();
      expect(
        screen.queryByLabelText("Assign an owner")
      ).not.toBeInTheDocument();
    });

    it("shows an Operator the owner read-only, even with the workflow on", async () => {
      installMockApi({ permissions: OPERATOR_PERMISSIONS });
      stubWorkflow(true);

      renderWithProviders(
        <ActionOwnerControl
          actionId="ACT-2041"
          owner={{ username: "said.albusaidi", displayName: "Said Al-Busaidi" }}
        />
      );

      expect(
        await screen.findByText("Owned by Said Al-Busaidi.")
      ).toBeVisible();
      expect(
        screen.queryByLabelText("Assign an owner")
      ).not.toBeInTheDocument();
    });

    it("tells an Operator when nobody owns it", async () => {
      installMockApi({ permissions: OPERATOR_PERMISSIONS });
      stubWorkflow(false);

      renderWithProviders(
        <ActionOwnerControl actionId="ACT-2041" owner={null} />
      );

      expect(
        await screen.findByText("This action has no owner.")
      ).toBeVisible();
    });
  });

  /**
   * Fails closed while the workflow answer is in flight — `useIsWorkflowEnabled`
   * returns `?? false`. A control that flickered into existence would invite a
   * click that then 403s.
   */
  it("does not offer the control before the workflow answer arrives", async () => {
    installMockApi({ permissions: SUPERVISOR_PERMISSIONS });
    stubActions();
    mockRoute("GET", /\/admin\/workflows$/, () => envelope(null), 500);

    renderWithProviders(
      <ActionOwnerControl actionId="ACT-2041" owner={null} />
    );

    expect(
      await screen.findByText(/Assignment is turned off by your administrator/)
    ).toBeVisible();
  });

  /**
   * The people list is a stand-in derived from the actions themselves — there is
   * no assignable-users endpoint in this build. It must not be requested at all
   * when the control cannot be used.
   */
  it("does not fetch assignable people when the control is unavailable", async () => {
    installMockApi({ permissions: SUPERVISOR_PERMISSIONS });
    stubWorkflow(false);

    let actionRequests = 0;
    mockRoute("GET", /\/actions$/, () => {
      actionRequests += 1;
      return paginatedEnvelope([action()]);
    });

    renderWithProviders(
      <ActionOwnerControl actionId="ACT-2041" owner={null} />
    );
    await screen.findByText(/Assignment is turned off/);

    await waitFor(() => expect(actionRequests).toBe(0));
  });
});
