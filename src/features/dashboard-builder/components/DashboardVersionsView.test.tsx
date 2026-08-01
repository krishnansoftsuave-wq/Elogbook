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

const { push, replace } = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));

import { DashboardVersionsView } from "@/features/dashboard-builder/components/DashboardVersionsView";
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

const version = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "DVER-001",
  dashboard_id: "DASH-OPERATOR",
  version: "v1.4",
  changed_by: "Admin",
  changed_at: "2026-08-01T02:00:00+00:00",
  status: "live",
  widgets_snapshot: [],
  layout_columns_snapshot: 3,
  changelog: ["Published from the current draft"],
  ...overrides,
});

afterEach(() => {
  resetMockApi();
  vi.mocked(toast.info).mockClear();
});

describe("DashboardVersionsView", () => {
  it("renders the live version's changelog in the publish panel", async () => {
    installMockApi({ permissions: SUPER_USER_PERMISSIONS });
    mockRoute("GET", /\/dashboard-builder\/configs\/operator$/, () =>
      envelope(config())
    );
    mockRoute("GET", /\/dashboard-builder\/configs\/operator\/versions$/, () =>
      envelope({ items: [version()] })
    );

    renderWithProviders(<DashboardVersionsView role="operator" />);

    expect(await screen.findByText("Changes in this version")).toBeVisible();
    expect(screen.getByText("Published from the current draft")).toBeVisible();
  });

  it("shows a dismissible success banner after publishing", async () => {
    const user = userEvent.setup();
    installMockApi({ permissions: SUPER_USER_PERMISSIONS });
    mockRoute("GET", /\/dashboard-builder\/configs\/operator$/, () =>
      envelope(config())
    );
    mockRoute("GET", /\/dashboard-builder\/configs\/operator\/versions$/, () =>
      envelope({ items: [version()] })
    );
    mockRoute(
      "POST",
      /\/dashboard-builder\/configs\/operator\/publish$/,
      () => {
        // The mutation's `onSuccess` invalidates both GETs above, so the
        // refetch that follows must see the new live version — same as a real
        // backend, where publish mutates the state those GETs read.
        mockRoute("GET", /\/dashboard-builder\/configs\/operator$/, () =>
          envelope(config({ published_version: "v1.5" }))
        );
        mockRoute(
          "GET",
          /\/dashboard-builder\/configs\/operator\/versions$/,
          () =>
            envelope({
              items: [
                version({ id: "DVER-002", version: "v1.5", status: "live" }),
                version({ status: "archived" }),
              ],
            })
        );
        return envelope({
          config: config({ published_version: "v1.5" }),
          version: version({ id: "DVER-002", version: "v1.5" }),
        });
      }
    );

    renderWithProviders(<DashboardVersionsView role="operator" />);

    await user.click(
      await screen.findByRole("button", { name: /Publish to Operators/ })
    );

    const banner = await screen.findByText(/is now live for 24 Operators\./);
    expect(banner).toBeVisible();
    expect(screen.getByText("Published successfully.")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() =>
      expect(
        screen.queryByText(/is now live for 24 Operators\./)
      ).not.toBeInTheDocument()
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows the banner immediately when arriving via ?published=1 from the Builder page", async () => {
    const user = userEvent.setup();
    installMockApi({ permissions: SUPER_USER_PERMISSIONS });
    mockRoute("GET", /\/dashboard-builder\/configs\/operator$/, () =>
      envelope(config())
    );
    mockRoute("GET", /\/dashboard-builder\/configs\/operator\/versions$/, () =>
      envelope({ items: [version()] })
    );

    renderWithProviders(
      <DashboardVersionsView role="operator" showPublishedBanner />
    );

    expect(
      await screen.findByText(/is now live for 24 Operators\./)
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(replace).toHaveBeenCalledWith(
      "/admin/dashboard-builder/operator/versions"
    );
  });

  it("shows a stub notice when Compare versions is clicked", async () => {
    const user = userEvent.setup();
    installMockApi({ permissions: SUPER_USER_PERMISSIONS });
    mockRoute("GET", /\/dashboard-builder\/configs\/operator$/, () =>
      envelope(config())
    );
    mockRoute("GET", /\/dashboard-builder\/configs\/operator\/versions$/, () =>
      envelope({ items: [version()] })
    );

    renderWithProviders(<DashboardVersionsView role="operator" />);

    await user.click(
      await screen.findByRole("button", { name: "Compare versions" })
    );

    expect(toast.info).toHaveBeenCalledWith(
      "Version comparison isn't available yet"
    );
  });
});
