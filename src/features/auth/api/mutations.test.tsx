import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { API_ENDPOINTS } from "@/constants/api";
import { ROUTES } from "@/constants/routes";
import { authKeys } from "@/features/auth/api/keys";
import { useSignInExchange, useSignOut } from "@/features/auth/api/mutations";
import { api } from "@/lib/api-client";
import { LOGOUT_EPOCH_KEY } from "@/lib/auth/tokenStorage";
import { useAuthStore } from "@/store/authStore";
import { createTestQueryClient, renderWithProviders } from "@/test/utils";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

const realAdapter = api.defaults.adapter;

const meta = {
  correlation_id: "c1",
  timestamp: "2026-07-30T09:58:47.185814+00:00",
};

/** §4's `200` body. `expires_in` is seconds. */
const tokenEnvelope = {
  success: true,
  data: {
    access_token: "minted-token",
    token_type: "Bearer",
    expires_in: 900,
  },
  meta,
};

/** §5's `GET /me` body — the second half of the exchange. */
const meEnvelope = {
  success: true,
  data: {
    subject: "dev|said.albusaidi",
    username: "said.albusaidi",
    display_name: "Said Al-Busaidi",
    roles: ["operator"],
    groups: ["OLNG-ELOG-OPERATORS"],
    permissions: ["shift:read", "summary:read", "action:read"],
    area_scope: null,
  },
  meta,
};

/** Branches on the endpoint, because one exchange now makes both calls. */
const signInAdapter =
  (): AxiosAdapter => async (config: InternalAxiosRequestConfig) => {
    const response: AxiosResponse = {
      data: config.url === API_ENDPOINTS.AUTH.ME ? meEnvelope : tokenEnvelope,
      status: 200,
      statusText: "",
      headers: {},
      config,
    };
    return response;
  };

const SignInProbe = () => {
  const signIn = useSignInExchange();

  return (
    <button
      type="button"
      onClick={() =>
        signIn.mutate({
          username: "said.albusaidi",
          groups: ["OLNG-ELOG-OPERATORS"],
        })
      }
    >
      Sign in
    </button>
  );
};

const SignOutProbe = () => {
  const signOut = useSignOut();

  return (
    <button type="button" onClick={signOut}>
      Sign out
    </button>
  );
};

describe("useSignInExchange", () => {
  beforeEach(() => {
    replace.mockClear();
    localStorage.clear();
    useAuthStore.setState({
      token: null,
      expiresAt: null,
      hasHydrated: true,
    });
    api.defaults.adapter = signInAdapter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    api.defaults.adapter = realAdapter;
    useAuthStore.setState({ token: null, expiresAt: null });
  });

  it("stores the minted token and the expiry the contract sent", async () => {
    renderWithProviders(<SignInProbe />);

    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(useAuthStore.getState().token).toBe("minted-token");
    });
    expect(useAuthStore.getState().expiresAt).toBeGreaterThan(Date.now());
  });

  it("verifies the token with /me and seeds the session cache", async () => {
    // The landing screen reads `useMe`; seeding here is what stops it firing a
    // second `GET /me` for an answer this exchange already has.
    //
    // Deliberately the production client: the seed has no observer until the
    // next screen mounts, so it survives only on `gcTime` — and an isolated
    // test client sets that to 0, which would collect it instantly and prove
    // nothing about the real one.
    const { queryClient } = renderWithProviders(<SignInProbe />);

    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(queryClient.getQueryData(authKeys.session())).toMatchObject({
        username: "said.albusaidi",
        displayName: "Said Al-Busaidi",
        permissions: ["shift:read", "summary:read", "action:read"],
      });
    });
  });

  it("empties the previous session's cache BEFORE the new token lands", async () => {
    // Ordering is the security property: if the token were set first, a query
    // could refetch and resolve against the outgoing user's cached data.
    const order: string[] = [];
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["previous-user"], "sensitive");

    const clearThrough = queryClient.clear.bind(queryClient);
    vi.spyOn(queryClient, "clear").mockImplementation(() => {
      order.push("clear");
      clearThrough();
    });
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.token) order.push("setSession");
    });

    renderWithProviders(<SignInProbe />, { queryClient });
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(useAuthStore.getState().token).toBe("minted-token");
    });
    unsubscribe();

    expect(order).toEqual(["clear", "setSession"]);
    expect(queryClient.getQueryData(["previous-user"])).toBeUndefined();
  });
});

describe("useSignOut", () => {
  beforeEach(() => {
    replace.mockClear();
    localStorage.clear();
    useAuthStore.setState({
      token: "token-1",
      expiresAt: Date.now() + 60_000,
      hasHydrated: true,
    });
  });

  afterEach(() => {
    useAuthStore.setState({ token: null, expiresAt: null });
  });

  it("discards the token locally — §9 has no logout endpoint to call", async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["probe"], "cached");
    renderWithProviders(<SignOutProbe />, { queryClient });

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(useAuthStore.getState().token).toBeNull();
    expect(queryClient.getQueryData(["probe"])).toBeUndefined();
    expect(replace).toHaveBeenCalledWith(ROUTES.LOGIN);
  });

  it("tells sibling tabs on the shared device to sign out too", async () => {
    renderWithProviders(<SignOutProbe />);

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(localStorage.getItem(LOGOUT_EPOCH_KEY)).not.toBeNull();
  });
});
