import type { Permission } from "@/constants/permissions";

/**
 * The whole sign-in surface. Nothing under here is gated, and a 401 raised on
 * one of these routes must not bounce the browser — the screen showing the
 * failure is the point (`authentication_flow.md` §5).
 */
export const AUTH_ROUTE_PREFIX = "/auth";

export const ROUTES = {
  /** Neutral authenticated landing: forwards to `homeForSession`. */
  HOME: "/",
  LOGIN: `${AUTH_ROUTE_PREFIX}/login`,
  /** Dev-only stand-in for the AD FS redirect, until tracker A-01 lands. */
  MOCK_ADFS: `${AUTH_ROUTE_PREFIX}/mock-adfs`,
  /** Where AD FS will land at cutover; today the `/dev/token` exchange. */
  CALLBACK: `${AUTH_ROUTE_PREFIX}/callback`,
  /** §5's deny screen for an AD account mapped to no platform role. */
  ACCESS_DENIED: `${AUTH_ROUTE_PREFIX}/access-denied`,
  ADMIN: {
    USERS: "/admin/users",
    USER_ADD: "/admin/users/add",
    USER_EDIT: (id: string) => `/admin/users/edit/${id}`,
    USER_PREVIEW: (id: string) => `/admin/users/${id}/preview`,
  },
  LOGBOOK: "/logbook",
  ENTRY_ADD: "/logbook/add",
  ENTRY_EDIT: (id: string) => `/logbook/edit/${id}`,
  ENTRY_PREVIEW: (id: string) => `/logbook/${id}/preview`,
} as const;

interface RoutePolicy {
  /** Covers the prefix itself and everything beneath it. */
  readonly prefix: string;
  /** ALL of these are required — `hasPermission` treats an array as a conjunction. */
  readonly permissions: readonly Permission[];
}

/**
 * The single route → permission table. Every gate reads it: the layout guards,
 * the sidebar filter, the root redirect and the edge proxy's "is this
 * protected" question all derive from these entries, so a route cannot be
 * guarded in one place and open in another.
 *
 * PROVISIONAL — this mapping is an inference, not a quoted requirement.
 * `authentication_flow.md` §6 lists the permissions and §5 says to gate on
 * them, but neither it nor the BRD says which of *this repo's* scaffold routes
 * each permission gates. `user:read` is the only permission the two admin-tree
 * roles share (administrator via `*`, super_user explicitly) and `shift:read`
 * is what every operational role holds, so these are the defensible reading —
 * but they need client confirmation. Correcting them is an edit to this table
 * and nothing else.
 */
export const ROUTE_PERMISSIONS = {
  ADMIN: { prefix: "/admin", permissions: ["user:read"] },
  LOGBOOK: { prefix: "/logbook", permissions: ["shift:read"] },
} as const satisfies Record<string, RoutePolicy>;

/**
 * Where a session may land, most privileged first. `homeForSession` returns the
 * first entry the session can actually reach, which is what keeps a redirect
 * from targeting a route that would bounce it straight back.
 */
export const HOME_CANDIDATES: readonly string[] = [
  ROUTES.ADMIN.USERS,
  ROUTES.LOGBOOK,
];
