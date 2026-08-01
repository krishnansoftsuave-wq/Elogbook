import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { DashboardBuilderView } from "@/features/dashboard-builder/components/DashboardBuilderView";
import {
  envelope,
  installMockApi,
  mockRoute,
  resetMockApi,
} from "@/test/mockApi";
import { renderWithProviders } from "@/test/utils";

const SUPER_USER_PERMISSIONS = [
  "dashboard:configure",
  "widget:assign",
  "metric:control",
  "access:control",
  "user:read",
];

const config = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "DASH-OPERATOR",
  role: "operator",
  name: "Shift Overview",
  status: "published",
  widgets: [
    {
      id: "DBW-001",
      label: "Shift KPIs",
      type: "kpi",
      enabled: true,
      order: 0,
    },
  ],
  assigned_roles: ["operator"],
  layout_columns: 3,
  is_default: true,
  last_updated_at: "2026-08-01T02:00:00+00:00",
  last_published_at: "2026-08-01T02:00:00+00:00",
  published_version: "v1.4",
  affected_user_count: 24,
  ...overrides,
});

const stubConfig = (overrides: Partial<Record<string, unknown>> = {}) => {
  mockRoute("GET", /\/dashboard-builder\/configs\/operator$/, () =>
    envelope(config(overrides))
  );
};

afterEach(() => {
  resetMockApi();
  push.mockClear();
});

describe("DashboardBuilderView", () => {
  it("renders the dashboard name, status and widgets", async () => {
    installMockApi({ permissions: SUPER_USER_PERMISSIONS });
    stubConfig();

    renderWithProviders(<DashboardBuilderView role="operator" />);

    expect(
      await screen.findByRole("heading", { name: "Operator · Shift Overview" })
    ).toBeVisible();
    expect(screen.getByText("Published")).toBeVisible();
    expect(screen.getByText("Shift KPIs")).toBeVisible();
  });

  it("saves a draft with the current widgets when Save draft is clicked", async () => {
    installMockApi({ permissions: SUPER_USER_PERMISSIONS });
    stubConfig();

    let sent: unknown;
    mockRoute(
      "PUT",
      /\/dashboard-builder\/configs\/operator$/,
      (requestConfig) => {
        sent = JSON.parse(String(requestConfig.data));
        return envelope(config());
      }
    );

    renderWithProviders(<DashboardBuilderView role="operator" />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Save draft" })
    );

    await waitFor(() =>
      expect(sent).toEqual({
        widgets: [
          {
            id: "DBW-001",
            label: "Shift KPIs",
            type: "kpi",
            enabled: true,
            order: 0,
          },
        ],
        assigned_roles: ["operator"],
        layout_columns: 3,
        is_default: true,
      })
    );
  });

  it("publishes the dashboard when Publish is clicked", async () => {
    installMockApi({ permissions: SUPER_USER_PERMISSIONS });
    stubConfig({ status: "draft" });

    let published = false;
    mockRoute(
      "POST",
      /\/dashboard-builder\/configs\/operator\/publish$/,
      () => {
        published = true;
        return envelope({
          config: config({ status: "published" }),
          version: {
            id: "DVER-9999",
            dashboard_id: "DASH-OPERATOR",
            version: "v1.5",
            changed_by: "Test User",
            changed_at: "2026-08-01T02:00:00+00:00",
            status: "live",
            widgets_snapshot: [],
            layout_columns_snapshot: 3,
            changelog: [],
          },
        });
      }
    );

    renderWithProviders(<DashboardBuilderView role="operator" />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Publish" })
    );

    await waitFor(() => expect(published).toBe(true));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        "/admin/dashboard-builder/operator/versions?published=1"
      )
    );
  });

  it("changes the layout column count", async () => {
    installMockApi({ permissions: SUPER_USER_PERMISSIONS });
    stubConfig();

    let sent: unknown;
    mockRoute(
      "PUT",
      /\/dashboard-builder\/configs\/operator$/,
      (requestConfig) => {
        sent = JSON.parse(String(requestConfig.data));
        return envelope(config({ layout_columns: 2 }));
      }
    );

    renderWithProviders(<DashboardBuilderView role="operator" />);

    await userEvent.click(await screen.findByRole("button", { name: "2" }));

    await waitFor(() => expect(sent).toMatchObject({ layout_columns: 2 }));
  });
});
