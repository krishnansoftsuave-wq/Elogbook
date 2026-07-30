import {
  AxiosError,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { API_ENDPOINTS } from "@/constants/api";
import { ROUTES } from "@/constants/routes";
import { api } from "@/lib/api-client";
import { getQueryClient } from "@/lib/query-client";
import { useAuthStore } from "@/store/authStore";

/** Every request the instance actually put on the wire, in order. */
const sent: { url: string; authorization: string }[] = [];

const realAdapter = api.defaults.adapter;

/**
 * Mocking at the adapter is mocking at the network boundary: both interceptors,
 * the header merge and the base URL all run for real, and only the socket is
 * replaced.
 */
const respondWith =
  (status: number, data: unknown = {}): AxiosAdapter =>
  async (config: InternalAxiosRequestConfig) => {
    sent.push({
      url: config.url ?? "",
      authorization: String(config.headers.get("Authorization") ?? ""),
    });

    const response: AxiosResponse = {
      data,
      status,
      statusText: "",
      headers: {},
      config,
    };
    if (status >= 200 && status < 300) return response;
    throw new AxiosError(
      `Request failed with status code ${status}`,
      "ERR_BAD_REQUEST",
      config,
      null,
      response
    );
  };

const errorEnvelope = (code: string, message: string) => ({
  success: false,
  error: { code, message, details: null },
  meta: { correlation_id: "c1", timestamp: "2026-07-30T09:58:47.185814+00:00" },
});

describe("api client", () => {
  let assign: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sent.length = 0;
    useAuthStore.setState({ token: "token-1", expiresAt: Date.now() + 60_000 });
    getQueryClient().setQueryData(["probe"], "cached");
    assign = vi.fn();
    // `Location`'s members are [LegacyUnforgeable], so jsdom refuses
    // `vi.spyOn(window.location, "assign")` with "Cannot redefine property".
    // Replacing the whole `location` global is the seam that does work.
    vi.stubGlobal("location", {
      pathname: "/logbook",
      search: "",
      protocol: "http:",
      assign,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    api.defaults.adapter = realAdapter;
    useAuthStore.setState({ token: null, expiresAt: null });
    getQueryClient().clear();
  });

  it("attaches the bearer token to a protected request", async () => {
    api.defaults.adapter = respondWith(200, { success: true });

    await api.get(API_ENDPOINTS.AUTH.ME);

    expect(sent[0]?.authorization).toBe("Bearer token-1");
  });

  it("does not attach the token to an auth-exempt request", async () => {
    api.defaults.adapter = respondWith(200, { success: true });

    await api.post(API_ENDPOINTS.AUTH.DEV_TOKEN, { username: "x" });

    expect(sent[0]?.authorization).toBe("");
  });

  it("ends the session on a 401 from a protected endpoint", async () => {
    api.defaults.adapter = respondWith(
      401,
      errorEnvelope("unauthorized", "Access token has expired.")
    );

    await expect(api.get(API_ENDPOINTS.AUTH.ME)).rejects.toBeInstanceOf(
      AxiosError
    );

    expect(useAuthStore.getState().token).toBeNull();
    expect(getQueryClient().getQueryData(["probe"])).toBeUndefined();
    expect(assign).toHaveBeenCalledWith(
      `${ROUTES.LOGIN}?returnTo=${encodeURIComponent("/logbook")}`
    );
  });

  it("drops a returnTo that could leave the origin", async () => {
    // Chromium normalises `/\host` to `//host`, so a path shaped like this must
    // never be handed back to the login page. Worker 4's hardened
    // `safeReturnTo` replaces this guard; the assertion outlives the swap.
    vi.stubGlobal("location", {
      pathname: "/\\evil.com",
      search: "",
      protocol: "http:",
      assign,
    });
    api.defaults.adapter = respondWith(
      401,
      errorEnvelope("unauthorized", "nope")
    );

    await expect(api.get(API_ENDPOINTS.AUTH.ME)).rejects.toBeInstanceOf(
      AxiosError
    );

    expect(assign).toHaveBeenCalledWith(ROUTES.LOGIN);
  });

  it("does not bounce a 401 that happened on the login page", async () => {
    vi.stubGlobal("location", {
      pathname: ROUTES.LOGIN,
      search: "",
      protocol: "http:",
      assign,
    });
    api.defaults.adapter = respondWith(
      401,
      errorEnvelope("unauthorized", "nope")
    );

    await expect(api.get(API_ENDPOINTS.AUTH.ME)).rejects.toBeInstanceOf(
      AxiosError
    );

    expect(useAuthStore.getState().token).toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });

  it("does not bounce a 401 raised during the sign-in redirect chain", async () => {
    // §3 gives an expired token and §5's unmapped-account deny the same 401
    // and the same `unauthorized` code, so the callback screen is the only
    // place that can tell the user which one happened. Navigating away would
    // replace that message with a login form. The session still ends.
    vi.stubGlobal("location", {
      pathname: ROUTES.CALLBACK,
      search: "?account=hamed.alsiyabi",
      protocol: "http:",
      assign,
    });
    api.defaults.adapter = respondWith(
      401,
      errorEnvelope(
        "unauthorized",
        "Access denied: your AD account is not mapped to any platform role. Contact an administrator to request access."
      )
    );

    await expect(api.get(API_ENDPOINTS.AUTH.ME)).rejects.toBeInstanceOf(
      AxiosError
    );

    expect(useAuthStore.getState().token).toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });

  it("keeps the session on a 403 so the caller can show permission denied", async () => {
    // §3: "keep them logged in but show a permission-denied state — the token
    // is still valid, they just can't do this specific action."
    api.defaults.adapter = respondWith(
      403,
      errorEnvelope(
        "forbidden",
        "Forbidden: requires the 'user:read' permission."
      )
    );

    await expect(api.get(API_ENDPOINTS.USERS.LIST)).rejects.toMatchObject({
      response: { status: 403 },
    });

    expect(useAuthStore.getState().token).toBe("token-1");
    expect(getQueryClient().getQueryData(["probe"])).toBe("cached");
    expect(assign).not.toHaveBeenCalled();
  });

  it("leaves the session alone when the token mint itself 401s", async () => {
    api.defaults.adapter = respondWith(
      401,
      errorEnvelope("unauthorized", "nope")
    );

    await expect(
      api.post(API_ENDPOINTS.AUTH.DEV_TOKEN, { username: "x" })
    ).rejects.toBeInstanceOf(AxiosError);

    expect(useAuthStore.getState().token).toBe("token-1");
    expect(assign).not.toHaveBeenCalled();
    // One attempt only: an exempt path that retried itself would loop.
    expect(sent).toHaveLength(1);
  });

  it("exempts a path only on a whole segment, never a substring", async () => {
    // `/health` is exempt; a path that merely contains it is not. Substring
    // matching failed open here — the request would have lost its bearer token
    // and its 401 teardown at the same time.
    api.defaults.adapter = respondWith(
      401,
      errorEnvelope("unauthorized", "nope")
    );

    await expect(api.get("/entries/x/health/y")).rejects.toBeInstanceOf(
      AxiosError
    );

    expect(sent[0]?.authorization).toBe("Bearer token-1");
    expect(useAuthStore.getState().token).toBeNull();
  });

  it("never attempts a token refresh", async () => {
    // §9: no refresh endpoint exists. A 401 must produce exactly one request
    // and no replay.
    api.defaults.adapter = respondWith(
      401,
      errorEnvelope("unauthorized", "Access token has expired.")
    );

    await expect(api.get(API_ENDPOINTS.AUTH.ME)).rejects.toBeInstanceOf(
      AxiosError
    );

    expect(sent).toHaveLength(1);
    expect(sent.map((request) => request.url)).toEqual([API_ENDPOINTS.AUTH.ME]);
  });
});
