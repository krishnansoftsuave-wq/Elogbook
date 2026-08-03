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
  /**
   * §7.10 / FR-ADM-01 — the admin directory, **a mirror of AD**.
   *
   * There is deliberately no `CREATE` and no `DELETE`. Identities originate in
   * Active Directory (FR-AUTH-02), and a user minted here would hold no AD
   * groups, so `resolveSession` could never sign them in. Both entries existed
   * before any handler did; removing them is what makes the constant describe
   * the contract rather than the scaffold's assumptions.
   */
  USERS: {
    LIST: "/users",
    DETAIL: (username: string) => `/users/${username}`,
    /** Platform access only — roles and AD groups are read-only. */
    ACCESS: (username: string) => `/users/${username}`,
  },
  ENTRIES: {
    LIST: "/entries",
    CREATE: "/entries",
    DETAIL: (id: string) => `/entries/${id}`,
    UPDATE: (id: string) => `/entries/${id}`,
    DELETE: (id: string) => `/entries/${id}`,
  },

  /* --- The prototype's operational surface (BRD §7.4–§7.12) --------------- */

  /** §7.6 — pending actions. */
  ACTIONS: {
    LIST: "/actions",
    DETAIL: (id: string) => `/actions/${id}`,
    /** FR-PA-04 lifecycle transition. */
    STATUS: (id: string) => `/actions/${id}/status`,
    /** FR-PA-05 — 403s unless the Administrator enabled the workflow. */
    OWNER: (id: string) => `/actions/${id}/owner`,
    COMMENTS: (id: string) => `/actions/${id}/comments`,
  },

  /**
   * FR-PA-01/02 — AI-extracted candidates. A sibling of `/actions` rather than
   * `/actions/suggestions`: Next resolves static segments before dynamic ones so
   * either would work, but a resource that is not an action should not sit at a
   * path that reads like one action's id.
   */
  SUGGESTIONS: {
    LIST: "/suggestions",
    CONFIRM: (id: string) => `/suggestions/${id}/confirm`,
  },

  /** §7.5 — shift summaries. */
  SUMMARIES: {
    LIST: "/summaries",
    /** FR-SUM-02 on-demand generation. FR-SUM-04: no approval gate. */
    GENERATE: "/summaries",
    DETAIL: (id: string) => `/summaries/${id}`,
    /** FR-SUM-08 — permitted only when the Admin has granted comment access. */
    COMMENTS: (id: string) => `/summaries/${id}/comments`,
  },

  /** §7.9 — in-app notifications. */
  NOTIFICATIONS: {
    LIST: "/notifications",
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    /** One write for "Mark all read" rather than the client looping `MARK_READ`. */
    MARK_ALL_READ: "/notifications/read-all",
  },

  /** §7.4 — the assistant. The answer itself is [BACKEND]. */
  ASSISTANT: {
    QUERY: "/assistant/query",
    /**
     * FR-FB-01 — thumbs up/down with an optional comment, on an answer or on
     * one of its citations. PROVISIONAL: no feedback endpoint existed in the
     * Phase 0a contract, so the path is inferred from the requirement.
     */
    FEEDBACK: "/assistant/feedback",
  },

  /**
   * §7.7 — trends & KPIs. **FR-AN-02**'s trend dashboard.
   *
   * One endpoint, because the screen is one render pass over five sections
   * (`app-source.txt` 1901–1982) and none of them can load without the others.
   * `SUMMARY` rather than `LIST`: the response is a composite document, not a
   * page of rows, so it carries no `total`/`page`.
   */
  TRENDS: {
    SUMMARY: "/trends",
  },

  /** §6.3 — Management risk decisions. No FR-ID of its own; see the schema. */
  DECISIONS: {
    LIST: "/decisions",
    CREATE: "/decisions",
    DETAIL: (id: string) => `/decisions/${id}`,
    STATUS: (id: string) => `/decisions/${id}/status`,
    COMMENTS: (id: string) => `/decisions/${id}/comments`,
  },

  /** ⚠️ PROTOTYPE-ONLY — no BRD basis. Deferred; contract only, no screens. */
  REQUESTS: {
    LIST: "/requests",
    CREATE: "/requests",
    DETAIL: (id: string) => `/requests/${id}`,
    RESOLUTION: (id: string) => `/requests/${id}/resolution`,
  },

  /** §7.10 — administration. */
  ADMIN: {
    /** FR-PA-05, FR-SUM-08, FR-ADM-06 — the four workflow switches. */
    WORKFLOWS: "/admin/workflows",
    /** FR-HOME-03 — Administrator-configurable shift boundaries. */
    SHIFT_CONFIG: "/admin/shift-config",
    /** FR-NOT-01 — per-user notification permissions. */
    NOTIFICATION_PERMISSIONS: "/admin/notification-permissions",
    NOTIFICATION_PERMISSION: (username: string) =>
      `/admin/notification-permissions/${username}`,
    /** §6 / FR-ADM-02 — base roles plus Administrator-created custom roles. */
    ROLES: "/admin/roles",
    ROLE: (id: string) => `/admin/roles/${id}`,
    /**
     * §7.11 / **FR-OBS-02**, **FR-OBS-04** — platform telemetry.
     * **[BACKEND]**: provisional, and Administrator-only per §6.4.
     */
    MONITORING: "/admin/monitoring",
  },

  /** §7.11 / §9.3 — append-only. There is deliberately no update or delete. */
  AUDIT: {
    LIST: "/audit",
  },

  /** §7.12 — FR-ADM-06's widget-to-role assignment. */
  DASHBOARDS: {
    WIDGETS: "/dashboards/widgets",
    WIDGET: (id: string) => `/dashboards/widgets/${id}`,
    /**
     * §7.12 / **FR-DASH-04** — one user's own arrangement, deliberately under
     * `/me` rather than `/dashboards`. There is no username parameter, so the
     * shape itself makes **FR-DASH-05** ("does not affect … other users")
     * unbreakable: the subject is always the bearer token.
     */
    MY_LAYOUT: "/me/dashboard-layout",
  },

  /**
   * ⚠️ The prototype's plant-operations cards (`specKpiSection`, app-source.txt
   * 751). **No BRD requirement covers these** — built at the owner's request
   * for demonstration, from invented figures. See
   * `features/plant-ops/schemas.ts`. **[BACKEND]**: no real source exists.
   */
  PLANT_OPERATIONS: {
    SUMMARY: "/plant-operations",
  },

  /**
   * ⚠️ The Super User dashboard's cards (`dashboard()` for `superuser`,
   * app-source.txt 1133–1165). **No BRD requirement covers them** — §6.5
   * describes the Super User's job, not their home screen.
   *
   * A sibling of `/admin/monitoring` rather than part of it: that endpoint is
   * Administrator-only per §6.4, and widening it so a Super User's card could
   * draw would have been an access decision made by a dashboard. See
   * `features/platform/schemas.ts`. **[BACKEND]**: no real source exists.
   */
  PLATFORM: {
    OVERVIEW: "/platform-overview",
  },

  /**
   * ⚠️ PROTOTYPE-ONLY — no BRD basis, unlike `DASHBOARDS` above. The
   * prototype's `dashboards()` list/builder/library/preview/publish flow
   * (`app-source.txt` 2045–2192), built at the user's explicit request
   * (2026-08-01). See `features/dashboard-builder/schemas.ts`.
   */
  DASHBOARD_BUILDER: {
    CONFIGS: "/dashboard-builder/configs",
    CONFIG: (role: string) => `/dashboard-builder/configs/${role}`,
    PUBLISH: (role: string) => `/dashboard-builder/configs/${role}/publish`,
    VERSIONS: (role: string) => `/dashboard-builder/configs/${role}/versions`,
    RESTORE: (role: string, versionId: string) =>
      `/dashboard-builder/configs/${role}/versions/${versionId}/restore`,
    LIBRARY: (role: string) => `/dashboard-builder/library?role=${role}`,
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

/**
 * The largest page any endpoint serves, mirroring the cap in
 * `mocks/handler.ts`. Used where a screen needs a whole collection rather than a
 * page — a comment thread, or the distinct values behind a filter.
 */
export const MAX_PAGE_SIZE = 100;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
