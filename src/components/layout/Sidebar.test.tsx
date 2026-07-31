import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Sidebar } from "@/components/layout/Sidebar";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import { renderWithProviders } from "@/test/utils";

/**
 * `useRouter` is here for `DevRoleSwitcher`, which the rail now renders in its
 * footer — dev-only scaffolding that replaced the `/auth/mock-adfs` account
 * picker. Its own behaviour is covered in `DevRoleSwitcher.test.tsx`; this file
 * only needs it not to throw.
 */
vi.mock("next/navigation", () => ({
  usePathname: () => "/actions",
  useRouter: () => ({ push: vi.fn() }),
}));

const realAdapter = api.defaults.adapter;

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
  meta: {
    correlation_id: "fca71eb84a9c4233a5fe43f5ce6421e9",
    timestamp: "2026-07-30T09:58:47.185814+00:00",
  },
});

const respondWith =
  (data: unknown): AxiosAdapter =>
  async (config: InternalAxiosRequestConfig) => {
    const response: AxiosResponse = {
      data,
      status: 200,
      statusText: "",
      headers: {},
      config,
    };
    return response;
  };

const signInWith = (permissions: readonly string[]) => {
  api.defaults.adapter = respondWith(meEnvelope(permissions));
  useAuthStore.setState({
    token: "token-1",
    expiresAt: Date.now() + 60_000,
    hasHydrated: true,
  });
};

describe("Sidebar", () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, expiresAt: null, hasHydrated: true });
    // Persisted, so the collapse test would otherwise leak into the next one.
    useSettingsStore.setState({ sidebarCollapsed: false });
  });

  afterEach(() => {
    api.defaults.adapter = realAdapter;
    useAuthStore.setState({ token: null, expiresAt: null });
  });

  it("shows only pending actions to a session holding action:read", async () => {
    signInWith(["shift:read", "summary:read", "action:read"]);

    renderWithProviders(<Sidebar />);

    expect(
      await screen.findByRole("link", { name: "Pending actions" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Users" })
    ).not.toBeInTheDocument();
  });

  it("shows only the user directory to a session holding user:read", async () => {
    signInWith(["dashboard:configure", "user:read"]);

    renderWithProviders(<Sidebar />);

    expect(
      await screen.findByRole("link", { name: "Users" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Pending actions" })
    ).not.toBeInTheDocument();
  });

  it("shows everything to the administrator wildcard", async () => {
    signInWith(["*"]);

    renderWithProviders(<Sidebar />);

    expect(
      await screen.findByRole("link", { name: "Pending actions" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Users" })).toBeInTheDocument();
  });

  it("shows nothing at all before a session exists", () => {
    renderWithProviders(<Sidebar />);

    expect(
      screen.getByRole("navigation", { name: "Main" })
    ).toBeEmptyDOMElement();
  });

  it("reports the collapse control's state through aria-pressed", async () => {
    // DS-10.5: a toggle keeps one accessible name and announces state via
    // `aria-pressed`. A name that flips instead leaves the button stateless to
    // a screen reader.
    signInWith(["shift:read"]);

    renderWithProviders(<Sidebar />);

    const toggle = await screen.findByRole("button", {
      name: "Collapse sidebar",
    });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(toggle);

    expect(
      screen.getByRole("button", { name: "Collapse sidebar" })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps each nav link named once the rail collapses", async () => {
    // Collapsed, the link used to hold nothing but an `aria-hidden` icon,
    // leaving `title` as the only accname source — the last-resort one, which
    // no major browser surfaces to a keyboard user. The label must survive as
    // real text, visually hidden.
    signInWith(["*"]);
    useSettingsStore.setState({ sidebarCollapsed: true });

    renderWithProviders(<Sidebar />);

    const actions = await screen.findByRole("link", {
      name: "Pending actions",
    });
    expect(actions).toHaveTextContent("Pending actions");
    expect(screen.getByRole("link", { name: "Users" })).toHaveTextContent(
      "Users"
    );
  });

  it("ignores a permission this build has never heard of", async () => {
    // A custom role from the admin API (§6) must not smuggle a nav item in.
    signInWith(["chaos:engineer"]);

    renderWithProviders(<Sidebar />);

    await vi.waitFor(() =>
      expect(useAuthStore.getState().token).toBe("token-1")
    );
    expect(
      screen.queryByRole("link", { name: "Pending actions" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Users" })
    ).not.toBeInTheDocument();
  });
});
