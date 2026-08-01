import { screen, waitFor } from "@testing-library/react";
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

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { WidgetLibraryView } from "@/features/dashboard-builder/components/WidgetLibraryView";
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

const libraryWidget = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "LIB-001",
  label: "Critical Alarms Trend",
  type: "line",
  category: "Charts",
  added: false,
  ...overrides,
});

const stubConfig = (overrides: Partial<Record<string, unknown>> = {}) => {
  mockRoute("GET", /\/dashboard-builder\/configs\/operator$/, () =>
    envelope(config(overrides))
  );
};

const stubLibrary = (items: ReturnType<typeof libraryWidget>[]) => {
  mockRoute("GET", /\/dashboard-builder\/library$/, () => envelope({ items }));
};

afterEach(() => {
  resetMockApi();
  push.mockClear();
});

describe("WidgetLibraryView", () => {
  it("renders the breadcrumb, title and available widgets", async () => {
    installMockApi({ permissions: SUPER_USER_PERMISSIONS });
    stubConfig();
    stubLibrary([libraryWidget()]);

    renderWithProviders(<WidgetLibraryView role="operator" />);

    expect(
      await screen.findByRole("heading", { name: "Widget Library" })
    ).toBeVisible();
    expect(
      screen.getByText("Add widgets to Operator · Shift Overview")
    ).toBeVisible();
    expect(screen.getByText("Critical Alarms Trend")).toBeVisible();
  });

  it("filters widgets by category tab", async () => {
    installMockApi({ permissions: SUPER_USER_PERMISSIONS });
    stubConfig();
    stubLibrary([
      libraryWidget({
        id: "LIB-001",
        label: "Critical Alarms Trend",
        category: "Charts",
      }),
      libraryWidget({
        id: "LIB-002",
        label: "Pending Actions",
        category: "Lists",
      }),
    ]);

    renderWithProviders(<WidgetLibraryView role="operator" />);

    await screen.findByText("Critical Alarms Trend");
    expect(screen.getByText("Pending Actions")).toBeVisible();

    await userEvent.click(screen.getByRole("tab", { name: "Charts" }));

    expect(screen.getByText("Critical Alarms Trend")).toBeVisible();
    expect(screen.queryByText("Pending Actions")).not.toBeInTheDocument();
  });

  it("filters widgets by search term", async () => {
    installMockApi({ permissions: SUPER_USER_PERMISSIONS });
    stubConfig();
    stubLibrary([
      libraryWidget({ id: "LIB-001", label: "Critical Alarms Trend" }),
      libraryWidget({
        id: "LIB-002",
        label: "Pending Actions",
        category: "Lists",
      }),
    ]);

    renderWithProviders(<WidgetLibraryView role="operator" />);

    await screen.findByText("Critical Alarms Trend");

    await userEvent.type(
      screen.getByRole("textbox", { name: "Search widgets" }),
      "pending"
    );

    expect(screen.queryByText("Critical Alarms Trend")).not.toBeInTheDocument();
    expect(screen.getByText("Pending Actions")).toBeVisible();
  });

  it("adds a widget to the dashboard when Add is clicked", async () => {
    installMockApi({ permissions: SUPER_USER_PERMISSIONS });
    stubConfig();
    stubLibrary([libraryWidget()]);

    let sent: unknown;
    mockRoute(
      "PUT",
      /\/dashboard-builder\/configs\/operator$/,
      (requestConfig) => {
        sent = JSON.parse(String(requestConfig.data));
        return envelope(config());
      }
    );

    renderWithProviders(<WidgetLibraryView role="operator" />);

    await userEvent.click(await screen.findByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(sent).toMatchObject({
        widgets: [
          {
            id: "DBW-001",
            label: "Shift KPIs",
            type: "kpi",
            enabled: true,
            order: 0,
          },
          {
            label: "Critical Alarms Trend",
            type: "line",
            enabled: true,
            order: 1,
          },
        ],
      })
    );
    expect(toast.success).toHaveBeenCalledWith("Draft saved");
  });

  it("shows Added instead of an Add button for widgets already on the dashboard", async () => {
    installMockApi({ permissions: SUPER_USER_PERMISSIONS });
    stubConfig();
    stubLibrary([libraryWidget({ label: "Shift KPIs", added: true })]);

    renderWithProviders(<WidgetLibraryView role="operator" />);

    await screen.findByText("Shift KPIs");
    expect(screen.getByText("Added")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Add" })
    ).not.toBeInTheDocument();
  });

  it("links back to the builder from Back to builder and Done", async () => {
    installMockApi({ permissions: SUPER_USER_PERMISSIONS });
    stubConfig();
    stubLibrary([libraryWidget()]);

    renderWithProviders(<WidgetLibraryView role="operator" />);

    expect(
      await screen.findByRole("link", { name: "Back to builder" })
    ).toHaveAttribute("href", "/admin/dashboard-builder/operator");

    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(push).toHaveBeenCalledWith("/admin/dashboard-builder/operator");
  });
});
