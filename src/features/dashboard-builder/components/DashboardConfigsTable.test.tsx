import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DashboardConfigsTable } from "@/features/dashboard-builder/components/DashboardConfigsTable";
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

afterEach(() => {
  resetMockApi();
});

describe("DashboardConfigsTable", () => {
  it("renders each role's dashboard, widget count, layout and status", async () => {
    installMockApi({ permissions: SUPER_USER_PERMISSIONS });
    mockRoute("GET", /\/dashboard-builder\/configs$/, () =>
      envelope({ items: [config()] })
    );

    renderWithProviders(<DashboardConfigsTable />);

    expect(await screen.findByText("Operator")).toBeVisible();
    expect(screen.getByText("Shift Overview")).toBeVisible();
    expect(screen.getByText("1 widget · 3 cols")).toBeVisible();
    expect(screen.getByText("Published")).toBeVisible();
  });

  it("shows Draft for an unpublished dashboard", async () => {
    installMockApi({ permissions: SUPER_USER_PERMISSIONS });
    mockRoute("GET", /\/dashboard-builder\/configs$/, () =>
      envelope({
        items: [
          config({
            role: "administrator",
            name: "System Health",
            status: "draft",
            last_published_at: null,
            published_version: null,
          }),
        ],
      })
    );

    renderWithProviders(<DashboardConfigsTable />);

    expect(await screen.findByText("Draft")).toBeVisible();
  });

  it("links each row's Edit dashboard action to the builder for that role", async () => {
    installMockApi({ permissions: SUPER_USER_PERMISSIONS });
    mockRoute("GET", /\/dashboard-builder\/configs$/, () =>
      envelope({ items: [config()] })
    );

    renderWithProviders(<DashboardConfigsTable />);

    expect(
      await screen.findByRole("link", { name: /Edit dashboard/ })
    ).toHaveAttribute("href", "/admin/dashboard-builder/operator");
  });
});
