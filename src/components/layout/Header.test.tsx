import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Header } from "@/components/layout/Header";
import { ROUTES } from "@/constants/routes";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import { renderWithProviders } from "@/test/utils";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/logbook",
}));

const realAdapter = api.defaults.adapter;

/**
 * jsdom ships no `ResizeObserver`, and the shared setup's stand-in is an arrow
 * function, which cannot be used with `new`. Base UI's floating positioner
 * constructs one the moment the menu opens. Stubbed locally rather than in
 * `src/test/setup.ts` so no other suite's behaviour moves.
 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverStub);

const meEnvelope = (roles: readonly string[]) => ({
  success: true,
  data: {
    subject: "dev|maryam.alzadjali",
    username: "maryam.alzadjali",
    display_name: "Maryam Al-Zadjali",
    roles,
    groups: ["OLNG-ELOG-OPERATORS"],
    permissions: ["shift:read"],
    area_scope: null,
  },
  meta: { correlation_id: "c1", timestamp: "2026-07-30T09:58:47.185814+00:00" },
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

const signInWith = (roles: readonly string[]) => {
  api.defaults.adapter = respondWith(meEnvelope(roles));
  useAuthStore.setState({
    token: "token-1",
    expiresAt: Date.now() + 60_000,
    hasHydrated: true,
  });
};

describe("Header", () => {
  beforeEach(() => {
    replace.mockClear();
    useAuthStore.setState({ token: null, expiresAt: null, hasHydrated: true });
    // Persisted, so a theme chosen in one test would otherwise leak forward.
    useSettingsStore.setState({ theme: "system" });
  });

  afterEach(() => {
    api.defaults.adapter = realAdapter;
    useAuthStore.setState({ token: null, expiresAt: null });
  });

  it("names the signed-in user and their roles", async () => {
    signInWith(["operator", "management"]);
    renderWithProviders(<Header />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Account menu" })
    );

    expect(await screen.findByText("Maryam Al-Zadjali")).toBeInTheDocument();
    expect(screen.getByText("Operator · Management")).toBeInTheDocument();
  });

  it("renders an administrator-created role this build has never heard of", async () => {
    // §6 lets an Administrator mint custom roles through the admin API, so
    // `roles` is an open string[]. Indexing the label table unguarded would
    // print "undefined" at best.
    signInWith(["shutdown_coordinator"]);
    renderWithProviders(<Header />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Account menu" })
    );

    expect(await screen.findByText("shutdown_coordinator")).toBeInTheDocument();
  });

  it("hides the account menu when there is no session", () => {
    renderWithProviders(<Header />);

    expect(
      screen.queryByRole("button", { name: "Account menu" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Change theme" })
    ).toBeInTheDocument();
  });

  it("says which theme is currently on", async () => {
    // WCAG 4.1.2: three mutually exclusive options rendered as plain menu
    // items expose no checked state, so a screen-reader user cannot tell
    // which one is active.
    useSettingsStore.setState({ theme: "dark" });
    renderWithProviders(<Header />);

    await userEvent.click(screen.getByRole("button", { name: "Change theme" }));

    expect(
      await screen.findByRole("menuitemradio", { name: "Dark" })
    ).toBeChecked();
    expect(
      screen.getByRole("menuitemradio", { name: "Light" })
    ).not.toBeChecked();
    expect(
      screen.getByRole("menuitemradio", { name: "System" })
    ).not.toBeChecked();
  });

  it("switches theme from the menu", async () => {
    useSettingsStore.setState({ theme: "system" });
    renderWithProviders(<Header />);

    await userEvent.click(screen.getByRole("button", { name: "Change theme" }));
    await userEvent.click(
      await screen.findByRole("menuitemradio", { name: "Light" })
    );

    expect(useSettingsStore.getState().theme).toBe("light");
  });

  it("discards the session on sign out", async () => {
    signInWith(["operator"]);
    renderWithProviders(<Header />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Account menu" })
    );
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Sign out" })
    );

    expect(useAuthStore.getState().token).toBeNull();
    expect(replace).toHaveBeenCalledWith(ROUTES.LOGIN);
  });
});
