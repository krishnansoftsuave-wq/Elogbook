import { beforeEach, describe, expect, it } from "vitest";

import { LEGACY_AUTH_COOKIES, SESSION_COOKIE } from "@/lib/auth/sessionCookie";
import { LOGOUT_EPOCH_KEY } from "@/lib/auth/tokenStorage";
import { AUTH_STORAGE_KEY, useAuthStore } from "@/store/authStore";

/** §4: `expires_in` is seconds — 900 (15 minutes) in stub mode. */
const EXPIRES_IN = 900;

const expireCookies = () => {
  for (const name of [SESSION_COOKIE, ...LEGACY_AUTH_COOKIES]) {
    document.cookie = `${name}=; Path=/; Max-Age=0`;
  }
};

describe("authStore", () => {
  beforeEach(() => {
    // setState rather than clearAuth: resetting a fixture must not look like a
    // sign-out to the cross-tab broadcast.
    useAuthStore.setState({ token: null, expiresAt: null });
    sessionStorage.clear();
    localStorage.clear();
    expireCookies();
  });

  it("holds the token and nothing that came from GET /me", () => {
    useAuthStore.getState().setSession("token-1", EXPIRES_IN);

    // Exact, not a subset: the point of this lane is that `user`, `roles`,
    // `permissions` and `areaScope` are owned by TanStack Query and can never
    // appear here.
    expect(Object.keys(useAuthStore.getState()).sort()).toEqual([
      "clearAuth",
      "expiresAt",
      "hasHydrated",
      "setHasHydrated",
      "setSession",
      "token",
    ]);
  });

  it("records the token and the expiry ceiling expires_in describes", () => {
    const before = Date.now();
    useAuthStore.getState().setSession("token-1", EXPIRES_IN);

    const state = useAuthStore.getState();
    expect(state.token).toBe("token-1");
    expect(state.expiresAt).toBeGreaterThanOrEqual(before + EXPIRES_IN * 1000);
  });

  it("mirrors the token into sessionStorage and never localStorage", () => {
    useAuthStore.getState().setSession("token-1", EXPIRES_IN);

    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toContain("token-1");
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(JSON.stringify(localStorage)).not.toContain("token-1");
  });

  it("survives a refresh within the tab", async () => {
    useAuthStore.getState().setSession("token-1", EXPIRES_IN);
    const persisted = sessionStorage.getItem(AUTH_STORAGE_KEY);
    expect(persisted).not.toBeNull();

    // Stand in for a reload: in-memory state gone, sessionStorage intact.
    // Restoring the payload is part of the fixture — persist writes through on
    // every setState, so blanking memory also blanks storage.
    useAuthStore.setState({ token: null, expiresAt: null });
    sessionStorage.setItem(AUTH_STORAGE_KEY, persisted ?? "");

    await useAuthStore.persist.rehydrate();

    expect(useAuthStore.getState().token).toBe("token-1");
  });

  it("flips hasHydrated only once persist has rehydrated", async () => {
    useAuthStore.setState({ hasHydrated: false });

    await useAuthStore.persist.rehydrate();

    expect(useAuthStore.getState().hasHydrated).toBe(true);
  });

  it("writes a presence marker to cookies, never the token", () => {
    useAuthStore.getState().setSession("token-1", EXPIRES_IN);

    expect(document.cookie).toContain(`${SESSION_COOKIE}=1`);
    expect(document.cookie).not.toContain("token-1");
  });

  it("leaves nothing behind on sign-out", () => {
    useAuthStore.getState().setSession("token-1", EXPIRES_IN);
    useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.expiresAt).toBeNull();
    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).not.toContain("token-1");
    expect(document.cookie).not.toContain(`${SESSION_COOKIE}=1`);
  });

  it("expires the role and token cookies the previous scaffold wrote", () => {
    document.cookie = "elogbook_token=stale-bearer-token; Path=/";
    document.cookie = "elogbook_role=administrator; Path=/";
    useAuthStore.getState().setSession("token-1", EXPIRES_IN);

    useAuthStore.getState().clearAuth();

    expect(document.cookie).not.toContain("stale-bearer-token");
    expect(document.cookie).not.toContain("administrator");
  });

  it("does not broadcast a logout epoch, because clearAuth also runs on a 401", () => {
    // The broadcast belongs to an explicit sign-out (`useSignOut`), not to
    // every end-of-session. Sessions are tab-scoped, so if this broadcast on a
    // 401, one operator's 15-minute token expiring would eject a different
    // person working in another tab — exactly the shared-device case
    // FR-AUTH-05 asks us to support. It also removes the epoch ping-pong
    // between tabs that the previous guard existed to suppress.
    useAuthStore.getState().setSession("token-1", EXPIRES_IN);
    useAuthStore.getState().clearAuth();

    expect(localStorage.getItem(LOGOUT_EPOCH_KEY)).toBeNull();
  });

  it("still ends the local session even though it stays silent", () => {
    useAuthStore.getState().setSession("token-1", EXPIRES_IN);
    useAuthStore.getState().clearAuth();

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().expiresAt).toBeNull();
  });
});
