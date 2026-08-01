import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

/*
  Mocked at the module boundary so the blocked-delete assertion can count the
  toast: `DeleteRoleDialog` has no inline error surface, unlike the assistant
  transcript, so the 409's message only ever reaches the user as a toast.
*/
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { RolesTable } from "@/features/admin/components/RolesTable";
import {
  envelope,
  installMockApi,
  mockRoute,
  paginatedEnvelope,
  resetMockApi,
} from "@/test/mockApi";
import { renderWithProviders } from "@/test/utils";

const ADMIN_PERMISSIONS = ["*"];

const NO_PERMISSIONS = {
  assistant: { view: false, generate: false, approve: false, export: false },
  summary: { view: false, generate: false, approve: false, export: false },
  actions: { view: false, generate: false, approve: false, export: false },
  reports: { view: false, generate: false, approve: false, export: false },
};

const role = (overrides: Record<string, unknown> = {}) => ({
  id: "ROLE-0008",
  name: "Turnaround Lead",
  member_count: 1,
  ad_group: "ELOGBOOK_TA_LEAD",
  type: "custom",
  permissions: NO_PERMISSIONS,
  data_scope: "full_plant",
  ...overrides,
});

const BASE_ROLE = role({
  id: "ROLE-0001",
  name: "Operator",
  member_count: 24,
  ad_group: "ELOGBOOK_OPERATOR",
  type: "base",
});

const stubRoles = (items: readonly unknown[] = [role()]) => {
  mockRoute("GET", /\/admin\/roles$/, () => paginatedEnvelope(items));
};

afterEach(() => {
  resetMockApi();
  vi.mocked(toast.error).mockClear();
});

describe("RolesTable", () => {
  it("shows the role, member count, AD group and type", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubRoles();

    renderWithProviders(<RolesTable />);

    const row = await screen.findByRole("row", {
      name: /Turnaround Lead/,
    });
    expect(within(row).getByText("1 user")).toBeVisible();
    expect(within(row).getByText("ELOGBOOK_TA_LEAD")).toBeVisible();
    expect(within(row).getByText("Custom")).toBeVisible();
  });

  it("pluralizes the member count for more than one member", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubRoles([BASE_ROLE]);

    renderWithProviders(<RolesTable />);

    const row = await screen.findByRole("row", { name: /Operator/ });
    expect(within(row).getByText("24 users")).toBeVisible();
    expect(within(row).getByText("Base")).toBeVisible();
  });

  it("offers an Edit link and a Delete control per row", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubRoles();

    renderWithProviders(<RolesTable />);

    expect(
      await screen.findByRole("link", { name: "Edit Turnaround Lead" })
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Delete Turnaround Lead" })
    ).toBeVisible();
  });

  it("confirms before deleting a role", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubRoles();

    let deletes = 0;
    mockRoute("DELETE", /\/admin\/roles\/ROLE-0008$/, () => {
      deletes += 1;
      return envelope({ id: "ROLE-0008" });
    });

    renderWithProviders(<RolesTable />);

    await userEvent.click(
      await screen.findByRole("button", {
        name: "Delete Turnaround Lead",
      })
    );

    const dialog = await screen.findByRole("alertdialog");
    expect(
      within(dialog).getByText(/Delete .*Turnaround Lead.*\?/)
    ).toBeVisible();

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Delete" })
    );

    await waitFor(() => expect(deletes).toBe(1));
  });

  it("sends nothing when the confirmation is cancelled", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubRoles();

    let deletes = 0;
    mockRoute("DELETE", /\/admin\/roles\//, () => {
      deletes += 1;
      return envelope({ id: "ROLE-0008" });
    });

    renderWithProviders(<RolesTable />);

    await userEvent.click(
      await screen.findByRole("button", {
        name: "Delete Turnaround Lead",
      })
    );
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Cancel",
      })
    );

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    );
    expect(deletes).toBe(0);
  });

  /**
   * The mock 409s a base role or one still in use; this proves the handler's
   * message reaches the user as a toast rather than failing silently.
   */
  it("toasts a blocked delete rather than failing silently", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubRoles([BASE_ROLE]);

    mockRoute(
      "DELETE",
      /\/admin\/roles\/ROLE-0001$/,
      () => ({
        success: false,
        error: {
          code: "conflict",
          message: "Operator is a base role and cannot be deleted.",
          details: null,
        },
        meta: { correlation_id: "test", timestamp: new Date(0).toISOString() },
      }),
      409
    );

    renderWithProviders(<RolesTable />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Delete Operator" })
    );
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Delete",
      })
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Operator is a base role and cannot be deleted."
      )
    );
  });

  it("paginates the fetched list client-side, matching the prototype's pager", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    const roles = Array.from({ length: 12 }, (_, index) =>
      role({
        id: `ROLE-${String(index).padStart(4, "0")}`,
        name: `Custom Role ${index + 1}`,
      })
    );
    stubRoles(roles);

    renderWithProviders(<RolesTable />);

    await screen.findByRole("row", { name: /Custom Role 1$/ });
    expect(screen.getByText("1–10 of 12")).toBeVisible();
    expect(
      screen.queryByRole("row", { name: /Custom Role 11/ })
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Page 2" }));

    await screen.findByRole("row", { name: /Custom Role 11/ });
    expect(screen.getByText("11–12 of 12")).toBeVisible();
    expect(
      screen.queryByRole("row", { name: /Custom Role 1$/ })
    ).not.toBeInTheDocument();
  });
});
