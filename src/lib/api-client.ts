import axios, { type InternalAxiosRequestConfig } from "axios";

import { API_BASE_URL, AUTH_EXEMPT_PATHS } from "@/constants/api";
import { AUTH_ROUTE_PREFIX, ROUTES } from "@/constants/routes";
import { safeReturnTo } from "@/lib/auth/returnTo";
import { getQueryClient } from "@/lib/query-client";
import { useAuthStore } from "@/store/authStore";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

/**
 * Exact match on the request path, or a match on a whole leading path segment.
 *
 * Substring matching was wrong in a way that fails open: any future path merely
 * *containing* an exempt one — a detail route whose id rendered as `x/health/y`
 * — would silently lose both its `Authorization` header and its 401 teardown.
 */
const isAuthExempt = (url: string | undefined): boolean => {
  if (!url) return false;
  const path = (url.split(/[?#]/)[0] ?? "").replace(/\/+$/, "");
  return AUTH_EXEMPT_PATHS.some(
    (exempt) => path === exempt || path.startsWith(`${exempt}/`)
  );
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Non-React code reads the store directly rather than having callbacks
  // injected from a provider (AGENTS.md §2).
  const token = useAuthStore.getState().token;
  if (token && !isAuthExempt(config.url)) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

/**
 * §3: "on `401`, clear any stored token and send the user back to login".
 *
 * There is no refresh to attempt — §9 states no refresh endpoint exists, so the
 * queue-and-replay machinery AGENTS.md §3 describes has nothing to call. That
 * deviation is deliberate; README.md, "No refresh-and-retry interceptor",
 * carries the reasoning for a reader who arrives from AGENTS.md.
 */
const endSession = (): void => {
  useAuthStore.getState().clearAuth();
  // The next user must never see the previous user's cache (AGENTS.md §2).
  getQueryClient().clear();

  if (typeof window === "undefined") return;
  // Anywhere in the sign-in surface, not just the login page: §3 gives an
  // expired token and §5's unmapped-account deny the same 401 and the same
  // `unauthorized` code, so the wire carries no discriminator. Navigating away
  // from `/auth/callback` on that 401 would replace the deny message with a
  // login form and the user would never learn why they were refused. The
  // session is still cleared — only the bounce is skipped.
  if (window.location.pathname.startsWith(AUTH_ROUTE_PREFIX)) return;

  const returnTo = safeReturnTo(
    `${window.location.pathname}${window.location.search}`
  );
  const destination = returnTo
    ? `${ROUTES.LOGIN}?returnTo=${encodeURIComponent(returnTo)}`
    : ROUTES.LOGIN;
  window.location.assign(destination);
};

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config) throw error;

    // §3 draws the line here: a 401 means the token is no good, a 403 means the
    // token is fine and this one action is not. A 403 must leave the session
    // intact so the caller can render a permission-denied state.
    if (error.response?.status === 401 && !isAuthExempt(error.config.url)) {
      endSession();
    }

    throw error;
  }
);
