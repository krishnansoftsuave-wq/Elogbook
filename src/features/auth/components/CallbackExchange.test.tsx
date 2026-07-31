import { screen, waitFor } from "@testing-library/react";
import {
  AxiosError,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { API_ENDPOINTS } from "@/constants/api";
import { ROUTES } from "@/constants/routes";
import { ACCESS_DENIED_MESSAGE } from "@/features/auth/components/AccessDeniedPanel";
import { CallbackExchange } from "@/features/auth/components/CallbackExchange";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/store/authStore";
import { renderWithProviders } from "@/test/utils";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

const realAdapter = api.defaults.adapter;

const meta = {
  correlation_id: "fca71eb84a9c4233a5fe43f5ce6421e9",
  timestamp: "2026-07-30T09:58:47.185814+00:00",
};

const TOKEN_OK = {
  success: true,
  data: { access_token: "minted-token", token_type: "Bearer", expires_in: 900 },
  meta,
};

/** Said Al-Busaidi — one group, one role, the §5 worked example. */
const ME_OK = {
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

const errorEnvelope = (code: string, message: string) => ({
  success: false,
  error: { code, message, details: null },
  meta,
});

interface StubbedResponse {
  status: number;
  data: unknown;
}

/** Branches on the endpoint so one render can exercise both calls in the chain. */
const adapterFor =
  (routes: Record<string, StubbedResponse>): AxiosAdapter =>
  async (config: InternalAxiosRequestConfig) => {
    const route = routes[config.url ?? ""];
    if (!route) return new Promise<AxiosResponse>(() => {});

    const response: AxiosResponse = {
      data: route.data,
      status: route.status,
      statusText: "",
      headers: {},
      config,
    };
    if (route.status >= 200 && route.status < 300) return response;
    throw new AxiosError(
      "Request failed",
      "ERR_BAD_REQUEST",
      config,
      null,
      response
    );
  };

describe("CallbackExchange", () => {
  beforeEach(() => {
    replace.mockClear();
    useAuthStore.setState({ token: null, expiresAt: null, hasHydrated: true });
    // Sitting on the callback route: `endSession` skips its bounce anywhere
    // under `/auth`, which is what lets this screen own the 401 message.
    vi.stubGlobal("location", {
      pathname: ROUTES.CALLBACK,
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

  it("shows the signing-in state while the exchange is in flight", () => {
    api.defaults.adapter = adapterFor({});

    renderWithProviders(<CallbackExchange account="said.albusaidi" />);

    expect(screen.getByRole("status")).toHaveTextContent("Signing in");
    expect(replace).not.toHaveBeenCalled();
  });

  it("sends an operator to the dashboard once /me answers", async () => {
    api.defaults.adapter = adapterFor({
      [API_ENDPOINTS.AUTH.DEV_TOKEN]: { status: 200, data: TOKEN_OK },
      [API_ENDPOINTS.AUTH.ME]: { status: 200, data: ME_OK },
    });

    renderWithProviders(<CallbackExchange account="said.albusaidi" />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith(ROUTES.DASHBOARD));
    expect(useAuthStore.getState().token).toBe("minted-token");
  });

  it("returns the visitor to the route they were bounced from", async () => {
    api.defaults.adapter = adapterFor({
      [API_ENDPOINTS.AUTH.DEV_TOKEN]: { status: 200, data: TOKEN_OK },
      [API_ENDPOINTS.AUTH.ME]: { status: 200, data: ME_OK },
    });

    renderWithProviders(
      <CallbackExchange account="said.albusaidi" returnTo="/logbook/add" />
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/logbook/add"));
  });

  it("refuses a returnTo that would leave the origin", async () => {
    // `/\evil.com` resolves to `http://evil.com/`. The page validates before
    // rendering; this proves the component does not trust that it did.
    api.defaults.adapter = adapterFor({
      [API_ENDPOINTS.AUTH.DEV_TOKEN]: { status: 200, data: TOKEN_OK },
      [API_ENDPOINTS.AUTH.ME]: { status: 200, data: ME_OK },
    });

    renderWithProviders(
      <CallbackExchange
        account="said.albusaidi"
        returnTo={`/${String.fromCharCode(92)}evil.com`}
      />
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith(ROUTES.DASHBOARD));
    expect(replace).not.toHaveBeenCalledWith(
      `/${String.fromCharCode(92)}evil.com`
    );
  });

  it("renders §5's deny in place when /me answers 401, without navigating away", async () => {
    // The regression this pins: `endSession` clears the query cache inside the
    // interceptor, and `QueryCache.clear()` destroys an in-flight query with a
    // silent cancel that never dispatches its error. When `/me` was observed
    // through `useMe`, this screen sat on "Signing in…" forever and the deny
    // below never rendered. The exchange drives `/me` as a mutation for exactly
    // that reason — a mutation's error survives the same clear.
    //
    // This only holds because `renderWithProviders` shares the production
    // `getQueryClient()` singleton. Against an injected client the clear lands
    // somewhere else and this test passes no matter what the component does.
    api.defaults.adapter = adapterFor({
      [API_ENDPOINTS.AUTH.DEV_TOKEN]: { status: 200, data: TOKEN_OK },
      [API_ENDPOINTS.AUTH.ME]: {
        status: 401,
        data: errorEnvelope("unauthorized", ACCESS_DENIED_MESSAGE),
      },
    });

    renderWithProviders(<CallbackExchange account="said.albusaidi" />);

    expect(
      await screen.findByRole("heading", { name: "Access denied" })
    ).toBeInTheDocument();
    expect(screen.getByText(ACCESS_DENIED_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    // The interceptor cleared the session but left the screen standing.
    expect(window.location.assign).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(useAuthStore.getState().token).toBeNull();
  });

  it("treats the stub's 422 for an unmapped AD group as the same deny", async () => {
    // §4 rejects a group outside the roles table before minting, so in stub
    // mode the condition §5 describes surfaces one step earlier.
    api.defaults.adapter = adapterFor({
      [API_ENDPOINTS.AUTH.DEV_TOKEN]: {
        status: 422,
        data: errorEnvelope(
          "validation_error",
          "Unknown AD group(s): OLNG-CONTRACTORS. Valid groups: OLNG-ELOG-ADMINS"
        ),
      },
    });

    renderWithProviders(<CallbackExchange account="hamed.alsiyabi" />);

    expect(
      await screen.findByRole("heading", { name: "Access denied" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Unknown AD group\(s\): OLNG-CONTRACTORS/)
    ).toBeInTheDocument();
  });

  it("explains a sign-in request that names no known account", () => {
    api.defaults.adapter = adapterFor({});

    renderWithProviders(<CallbackExchange account="nobody.here" />);

    expect(
      screen.getByRole("heading", { name: /couldn.t sign you in/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to sign in" })
    ).toHaveAttribute("href", ROUTES.LOGIN);
  });

  it("surfaces the server's message when the exchange itself fails", async () => {
    api.defaults.adapter = adapterFor({
      [API_ENDPOINTS.AUTH.DEV_TOKEN]: {
        status: 500,
        data: errorEnvelope("internal_error", "Token service is unavailable."),
      },
    });

    renderWithProviders(<CallbackExchange account="said.albusaidi" />);

    expect(
      await screen.findByText("Token service is unavailable.")
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
