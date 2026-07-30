/**
 * Every endpoint the app talks to, grouped by feature. Nothing may inline a URL
 * string at a call site.
 */
export const API_ENDPOINTS = {
  AUTH: {
    /** Stub-mode token mint; 404s once real AD FS lands (§4, tracker A-01). */
    DEV_TOKEN: "/dev/token",
    ME: "/me",
  },
  HEALTH: {
    CHECK: "/health",
    READY: "/ready",
  },
  SHIFTS: {
    /** §7 — auth required, permission `shift:read`. */
    CURRENT: "/shifts/current",
  },
  USERS: {
    LIST: "/users",
    CREATE: "/users",
    DETAIL: (id: string) => `/users/${id}`,
    UPDATE: (id: string) => `/users/${id}`,
    DELETE: (id: string) => `/users/${id}`,
  },
  ENTRIES: {
    LIST: "/entries",
    CREATE: "/entries",
    DETAIL: (id: string) => `/entries/${id}`,
    UPDATE: (id: string) => `/entries/${id}`,
    DELETE: (id: string) => `/entries/${id}`,
  },
} as const;

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/**
 * Requests whose own 401 must not end the session — they are how a session
 * starts, or they need no session at all. There is deliberately no logout or
 * refresh entry: `authentication_flow.md` §9 says neither endpoint exists,
 * because auth is stateless and a 15-minute token is re-obtained by
 * re-authenticating.
 */
export const AUTH_EXEMPT_PATHS: readonly string[] = [
  API_ENDPOINTS.AUTH.DEV_TOKEN,
  API_ENDPOINTS.HEALTH.CHECK,
];

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
