import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { NotificationPermissionsTable } from "@/features/admin/components/NotificationPermissionsTable";
import {
  envelope,
  installMockApi,
  mockRoute,
  paginatedEnvelope,
  resetMockApi,
} from "@/test/mockApi";
import { renderWithProviders } from "@/test/utils";

const ADMIN_PERMISSIONS = ["*"];

const OFF = { in_app: false, email: false };

const row = (overrides: Record<string, unknown> = {}) => ({
  username: "said.albusaidi",
  display_name: "Said Al-Busaidi",
  role_label: "Operator",
  permissions: {
    action_assigned: { in_app: true, email: false },
    action_overdue: OFF,
    summary_ready: OFF,
    report_ready: OFF,
  },
  ...overrides,
});

const stubRows = (items: readonly unknown[] = [row()]) => {
  mockRoute("GET", /\/admin\/notification-permissions$/, () =>
    paginatedEnvelope(items)
  );
};

afterEach(() => {
  resetMockApi();
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
});

describe("NotificationPermissionsTable", () => {
  it("shows one row per user with their role and current toggle state", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubRows();

    renderWithProviders(<NotificationPermissionsTable />);

    const tableRow = await screen.findByRole("row", {
      name: /Said Al-Busaidi/,
    });
    expect(within(tableRow).getByText("Operator")).toBeVisible();
    expect(
      within(tableRow).getByRole("switch", {
        name: "Said Al-Busaidi — Action Assigned, in-app",
      })
    ).toBeChecked();
    expect(
      within(tableRow).getByRole("switch", {
        name: "Said Al-Busaidi — Action Assigned, email",
      })
    ).not.toBeChecked();
  });

  it("flips a toggle locally without saving until Save is pressed", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubRows();

    let puts = 0;
    mockRoute(
      "PUT",
      /\/admin\/notification-permissions\/said\.albusaidi$/,
      () => {
        puts += 1;
        return envelope(row());
      }
    );

    renderWithProviders(<NotificationPermissionsTable />);

    const emailToggle = await screen.findByRole("switch", {
      name: "Said Al-Busaidi — Action Assigned, email",
    });
    await userEvent.click(emailToggle);

    expect(emailToggle).toBeChecked();
    expect(puts).toBe(0);
  });

  it("sends the whole row's permission map on Save", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubRows();

    let sentBody: unknown = null;
    mockRoute(
      "PUT",
      /\/admin\/notification-permissions\/said\.albusaidi$/,
      (config) => {
        sentBody =
          typeof config.data === "string"
            ? JSON.parse(config.data)
            : config.data;
        return envelope(
          row({
            permissions: {
              action_assigned: { in_app: true, email: true },
              action_overdue: OFF,
              summary_ready: OFF,
              report_ready: OFF,
            },
          })
        );
      }
    );

    renderWithProviders(<NotificationPermissionsTable />);

    await userEvent.click(
      await screen.findByRole("switch", {
        name: "Said Al-Busaidi — Action Assigned, email",
      })
    );
    await userEvent.click(screen.getByRole("button", { name: /^Save$/ }));

    await waitFor(() =>
      expect(sentBody).toEqual({
        permissions: {
          action_assigned: { in_app: true, email: true },
          action_overdue: OFF,
          summary_ready: OFF,
          report_ready: OFF,
        },
      })
    );
  });

  it("toasts success once the save resolves", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubRows();
    mockRoute(
      "PUT",
      /\/admin\/notification-permissions\/said\.albusaidi$/,
      () => envelope(row())
    );

    renderWithProviders(<NotificationPermissionsTable />);

    await userEvent.click(
      await screen.findByRole("button", { name: /^Save$/ })
    );

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("toasts on Export without calling the server", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubRows();

    renderWithProviders(<NotificationPermissionsTable />);

    await userEvent.click(
      await screen.findByRole("button", { name: /^Export$/ })
    );

    expect(toast.info).toHaveBeenCalledWith("Exported notification matrix");
  });

  it("paginates client-side once the fetched list exceeds one page", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    const rows = Array.from({ length: 12 }, (_, index) =>
      row({
        username: `user${index}`,
        display_name: `User ${index}`,
      })
    );
    stubRows(rows);

    renderWithProviders(<NotificationPermissionsTable />);

    expect(await screen.findByText(/User 0/)).toBeVisible();
    expect(screen.queryByText(/User 11/)).not.toBeInTheDocument();
    expect(screen.getByText(/1–10 of 12/)).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Page 2" }));

    expect(await screen.findByText(/User 11/)).toBeVisible();
    expect(screen.queryByText(/User 0$/)).not.toBeInTheDocument();
  });

  it("shows an error state rather than an empty table when the list fails to load", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    mockRoute(
      "GET",
      /\/admin\/notification-permissions$/,
      () => ({
        success: false,
        error: { code: "forbidden", message: "Nope", details: null },
        meta: { correlation_id: "test", timestamp: new Date(0).toISOString() },
      }),
      403
    );

    renderWithProviders(<NotificationPermissionsTable />);

    // The shared client retries a read once with a ~1s backoff, so the error
    // state cannot appear inside the 1s default `findBy` window.
    expect(
      await screen.findByRole("alert", undefined, { timeout: 5000 })
    ).toHaveTextContent(/could not be loaded/i);
  });
});
