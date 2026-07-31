import { screen } from "@testing-library/react";
import {
  AxiosError,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RoleGuard } from "@/components/layout/RoleGuard";
import { Sidebar } from "@/components/layout/Sidebar";
import { ROUTE_PERMISSIONS, ROUTES } from "@/constants/routes";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/store/authStore";
import { renderWithProviders } from "@/test/utils";

const { replace, pathname } = vi.hoisted(() => ({
  replace: vi.fn(),
  pathname: { current: "/admin/users" },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => pathname.current,
}));

const realAdapter = api.defaults.adapter;

const meta = {
  correlation_id: "fca71eb84a9c4233a5fe43f5ce6421e9",
  timestamp: "2026-07-30T09:58:47.185814+00:00",
};

/** §5's `GET /me` body, snake_case exactly as the wire sends it. */
const meEnvelope = (permissions: readonly string[]) => ({
  success: true,
  data: {
    subject: "dev|said.albusaidi",
    username: "said.albusaidi",
    display_name: "Said Al Busaidi",
    roles: ["operator"],
    groups: ["OLNG-ELOG-OPERATORS"],
    permissions,
    area_scope: null,
  },
  meta,
});

const respondWith =
  (status: number, data: unknown): AxiosAdapter =>
  async (config: InternalAxiosRequestConfig) => {
    const response: AxiosResponse = {
      data,
      status,
      statusText: "",
      headers: {},
      config,
    };
    if (status >= 200 && status < 300) return response;
    throw new AxiosError(
      "Request failed",
      "ERR_BAD_REQUEST",
      config,
      null,
      response
    );
  };

/** Signs a session in at the network boundary, not by stubbing the hook. */
const signInWith = (permissions: readonly string[]) => {
  api.defaults.adapter = respondWith(200, meEnvelope(permissions));
  useAuthStore.setState({
    token: "token-1",
    expiresAt: Date.now() + 60_000,
    hasHydrated: true,
  });
};

const ADMIN_ONLY = ROUTE_PERMISSIONS.ADMIN.permissions;
const ACTIONS_ONLY = ROUTE_PERMISSIONS.ACTIONS.permissions;

describe("RoleGuard", () => {
  beforeEach(() => {
    replace.mockClear();
    pathname.current = "/admin/users";
    useAuthStore.setState({
      token: null,
      expiresAt: null,
      hasHydrated: true,
    });
    vi.stubGlobal("location", {
      pathname: "/admin/users",
      search: "",
      protocol: "http:",
      assign: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    api.defaults.adapter = realAdapter;
    useAuthStore.setState({ token: null, expiresAt: null });
  });

  it("renders children when the session holds the required permission", async () => {
    signInWith(["user:read"]);

    renderWithProviders(
      <RoleGuard require={ADMIN_ONLY}>
        <h1>User directory</h1>
      </RoleGuard>
    );

    expect(
      await screen.findByRole("heading", { name: "User directory" })
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("renders children for the administrator wildcard", async () => {
    signInWith(["*"]);

    renderWithProviders(
      <RoleGuard require={ADMIN_ONLY}>
        <h1>User directory</h1>
      </RoleGuard>
    );

    expect(
      await screen.findByRole("heading", { name: "User directory" })
    ).toBeInTheDocument();
  });

  it("renders children for any signed-in session when nothing is required", async () => {
    signInWith(["shift:read"]);

    renderWithProviders(
      <RoleGuard>
        <h1>Shell</h1>
      </RoleGuard>
    );

    expect(
      await screen.findByRole("heading", { name: "Shell" })
    ).toBeInTheDocument();
  });

  it("shows the loading state and no children before the store rehydrates", () => {
    signInWith(["*"]);
    useAuthStore.setState({ hasHydrated: false });

    renderWithProviders(
      <RoleGuard require={ADMIN_ONLY}>
        <h1>User directory</h1>
      </RoleGuard>
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Checking your access"
    );
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    // Deciding before hydration would bounce a signed-in user on every refresh.
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows the loading state and no children while /me is in flight", () => {
    signInWith(["*"]);

    renderWithProviders(
      <RoleGuard require={ADMIN_ONLY}>
        <h1>User directory</h1>
      </RoleGuard>
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Checking your access"
    );
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("sends an anonymous visitor to login carrying the route they wanted", async () => {
    renderWithProviders(
      <RoleGuard require={ADMIN_ONLY}>
        <h1>User directory</h1>
      </RoleGuard>
    );

    await vi.waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        `${ROUTES.LOGIN}?returnTo=${encodeURIComponent("/admin/users")}`
      )
    );
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("never forwards a returnTo that could leave the origin", async () => {
    pathname.current = `/${String.fromCharCode(92)}evil.com`;

    renderWithProviders(
      <RoleGuard require={ADMIN_ONLY}>
        <h1>User directory</h1>
      </RoleGuard>
    );

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith(ROUTES.LOGIN));
  });

  it("sends a wrong-permission session to its own home, never /unauthorized", async () => {
    // An operational permission set: `shift:read` alone opens no route now that
    // `/logbook` has left `HOME_CANDIDATES`, and no real role holds it alone —
    // Operator, Supervisor and Management all carry `action:read` too.
    signInWith(["shift:read", "action:read"]);

    renderWithProviders(
      <RoleGuard require={ADMIN_ONLY}>
        <h1>User directory</h1>
      </RoleGuard>
    );

    await vi.waitFor(() =>
      expect(replace).toHaveBeenCalledWith(ROUTES.DASHBOARD)
    );
    expect(replace).not.toHaveBeenCalledWith("/unauthorized");
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("blocks the admin tree for a session whose nav item is hidden (FR-ADM-03)", async () => {
    // Hiding a link is not access control. The operator never sees the Users
    // link, and typing the route in anyway still does not get them in.
    signInWith(["shift:read", "action:read"]);

    renderWithProviders(
      <>
        <Sidebar />
        <RoleGuard require={ADMIN_ONLY}>
          <h1>User directory</h1>
        </RoleGuard>
      </>
    );

    expect(
      await screen.findByRole("link", { name: "Pending actions" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Users" })
    ).not.toBeInTheDocument();

    await vi.waitFor(() =>
      expect(replace).toHaveBeenCalledWith(ROUTES.DASHBOARD)
    );
    expect(
      screen.queryByRole("heading", { name: "User directory" })
    ).not.toBeInTheDocument();
  });

  it("keeps a super user out of pending actions and sends them to the admin tree", async () => {
    // `super_user` holds `user:read` and no `action:read` — the inverse bounce.
    pathname.current = "/actions";
    signInWith(["dashboard:configure", "user:read"]);

    renderWithProviders(
      <RoleGuard require={ACTIONS_ONLY}>
        <h1>Pending actions</h1>
      </RoleGuard>
    );

    await vi.waitFor(() =>
      expect(replace).toHaveBeenCalledWith(ROUTES.ADMIN.USERS)
    );
  });
});
