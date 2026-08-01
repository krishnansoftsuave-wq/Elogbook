import { WILDCARD_PERMISSION, type Permission } from "@/constants/permissions";

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
  /**
   * Where AD FS will land at cutover; today the `/dev/token` exchange.
   *
   * `MOCK_ADFS` used to sit above this — an invented "Choose an account" screen
   * standing between the sign-in button and here. It is gone: the button
   * redirects straight to this reply URL, which is what real AD FS does once
   * somebody has authenticated, and choosing an identity moved to
   * `DevRoleSwitcher` in the sidebar footer where the prototype puts it.
   */
  CALLBACK: `${AUTH_ROUTE_PREFIX}/callback`,
  /** §5's deny screen for an AD account mapped to no platform role. */
  ACCESS_DENIED: `${AUTH_ROUTE_PREFIX}/access-denied`,
  /**
   * §7.10 — administration.
   *
   * `USER_ADD` and `USER_EDIT` are gone with the routes behind them. The
   * directory mirrors Active Directory (**FR-AUTH-02**), so there is nothing to
   * create here and nothing to edit but platform access, which is a control on
   * the row rather than a screen of its own. Keyed by `username` for the same
   * reason the API is.
   */
  ADMIN: {
    USERS: "/admin/users",
    USER_PREVIEW: (username: string) => `/admin/users/${username}/preview`,
    /** FR-PA-05 / FR-SUM-08 / FR-ADM-06 — the four workflow switches. */
    WORKFLOWS: "/admin/workflows",
    /** §6 / FR-ADM-02 — base roles plus Administrator-created custom roles. */
    ROLES: "/admin/roles",
    /**
     * `roleFormScreen` (`app-source.txt` 1613–1630) — permissions matrix, data
     * scope and AD group mapping.
     */
    ROLE_ADD: "/admin/roles/add",
    ROLE_EDIT: (id: string) => `/admin/roles/${id}/edit`,
    /** FR-ADM-05 / FR-OBS-01 / §9.3 — the immutable trail. */
    AUDIT: "/admin/audit",
    /** FR-HOME-03 — Administrator-configurable shift boundaries. */
    SHIFT_CONFIG: "/admin/shift-config",
    /** §6.4 / FR-NOT-01 — per-user notification permissions. */
    NOTIFICATIONS: "/admin/notifications",
    /** §7.12 / FR-ADM-06 — the widget-to-role assignment screen. */
    DASHBOARDS: "/admin/dashboards",
    /**
     * ⚠️ PROTOTYPE-ONLY — no BRD basis, unlike `DASHBOARDS` above. The
     * prototype's `dashboards()` list/builder/preview/publish flow
     * (`app-source.txt` 2045–2192), built at the user's explicit request.
     * See `features/dashboard-builder/schemas.ts`.
     */
    DASHBOARD_BUILDER: {
      LIST: "/admin/dashboard-builder",
      EDIT: (role: string) => `/admin/dashboard-builder/${role}`,
      LIBRARY: (role: string) => `/admin/dashboard-builder/${role}/library`,
      PREVIEW: (role: string) => `/admin/dashboard-builder/${role}/preview`,
      VERSIONS: (role: string) => `/admin/dashboard-builder/${role}/versions`,
    },
  },
  /** §7.2 / FR-HOME-01 — the role-based dashboard FR-AUTH-01 redirects to. */
  DASHBOARD: "/dashboard",
  /** §7.6 — pending actions. */
  ACTIONS: "/actions",
  ACTION_DETAIL: (id: string) => `/actions/${id}`,
  /** §7.5 — shift summaries. */
  SUMMARIES: "/summaries",
  SUMMARY_DETAIL: (id: string) => `/summaries/${id}`,
  /** §7.4 — the bilingual AI assistant. */
  ASSISTANT: "/assistant",
  /** §7.7 / FR-AN-02 — the trend dashboard. */
  TRENDS: "/trends",
  /** §7.9 — in-app notifications. */
  NOTIFICATIONS: "/notifications",
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
  /**
   * §7.10 — the workflow switches, and **the first nested policy in this
   * table**. `requiredPermissionsFor` resolves the longest matching prefix, so
   * this overrides `ADMIN` for `/admin/workflows` and everything beneath it
   * while leaving `/admin/users` on `user:read`.
   *
   * **`access:control`, not the wildcard** — this entry was wrong once and the
   * correction is worth recording. It read `[WILDCARD_PERMISSION]`, justified by
   * §6.5's *fifth* bullet ("Can view users"). Its **fourth** bullet is
   * *"Control access to comments and the decision workflow"*, and **FR-ADM-06**,
   * **FR-DASH-03** and the §4 role table all say the same — so two of the four
   * switches on this screen are a Super User capability, and the wildcard locked
   * the one role a requirement names out of it.
   *
   * `access:control` is the permission §6 grants the Super User and, until now,
   * the only one of theirs that gated nothing anywhere in the app. Which of the
   * four switches each session may actually flip is decided per key by
   * `WORKFLOW_PERMISSION` — a route gate cannot express that, and should not
   * pretend to.
   *
   * `user:read` rides along because a policy must record a route's **effective**
   * requirement, its own plus every ancestor guard's. The `(admin)` layout above
   * demands `user:read`; an entry naming only the leaf would admit a custom role
   * holding `access:control` alone and then have the group guard bounce it — the
   * infinite redirect `ACTIONS` documents.
   */
  ADMIN_WORKFLOWS: {
    prefix: "/admin/workflows",
    permissions: ["user:read", "access:control"],
  },
  /**
   * §7.11 — the audit trail, and **Administrator-only**.
   *
   * The wildcard, deliberately, one phase after `ADMIN_WORKFLOWS` was walked
   * *back* from it. That is the same test giving the opposite answer, not a
   * regression: workflows changed because the BRD names the Super User for that
   * capability four times over. Run the identical search here and §6.5's five
   * bullets are silent, while §6.4 gives the Administrator *"Monitor system
   * health; **review audit and AI-usage logs**; manage security settings"* and
   * §9.3 says the store is *"available to administrators for review"*.
   *
   * There is no `audit:read` to reach for, and inventing one would both invent a
   * requirement and *widen* access — a named permission is one an Admin-created
   * custom role could be granted, which no requirement authorises. The wildcard
   * is the only permission this build's model gives the Administrator and
   * withholds from the Super User, and `GET /audit` already takes it: a narrower
   * gate would admit somebody to a screen whose only request 403s.
   *
   * It subsumes the `(admin)` group's `user:read` rather than skipping it —
   * `hasPermission` treats `*` as holding everything — so the effective-
   * requirement rule is satisfied by the one entry.
   */
  ADMIN_AUDIT: {
    prefix: "/admin/audit",
    permissions: [WILDCARD_PERMISSION],
  },
  /**
   * §7.2 / FR-HOME-03 — shift boundaries. Administrator-only on the same
   * reading: §6.4 lists *"Configure shift timings; report and summary
   * generation follows configured times"*, §6.5 says nothing about it, and
   * `PUT /admin/shift-config` already takes the wildcard. (`GET` is open to any
   * session, because every dashboard needs to know where the boundary is.)
   */
  ADMIN_SHIFT_CONFIG: {
    prefix: "/admin/shift-config",
    permissions: [WILDCARD_PERMISSION],
  },
  /**
   * §6.4 — "Control, per user, which notifications each user may view /
   * receive." Administrator-only on the same reading as `ADMIN_ROLES` and
   * `ADMIN_SHIFT_CONFIG`: §6.5's five Super User bullets say nothing about
   * notification permissions, and `PATCH /admin/notification-permissions`
   * already takes the wildcard.
   */
  ADMIN_NOTIFICATIONS: {
    prefix: "/admin/notifications",
    permissions: [WILDCARD_PERMISSION],
  },
  /**
   * §7.12 — the widget-to-role assignment screen, and **Super User capable**
   * on the same reading `ADMIN_WORKFLOWS` above already established.
   *
   * **FR-ADM-06**: "Provide a **Super User** role for role-based dashboard and
   * permission management: ... assign widgets to roles, control which metrics
   * each role sees." **FR-DASH-02** says the same of "Admin and Super User"
   * together. `PUT /dashboards/widgets/:id` already gates on
   * `dashboard:configure`, which only the Super User role holds outright — an
   * Administrator reaches it through the wildcard.
   *
   * `user:read` rides along for the same reason it does on `ADMIN_WORKFLOWS`:
   * this route sits inside the `(admin)` group, whose layout demands it, so a
   * policy naming only the leaf permission would readmit the infinite-redirect
   * shape `ACTIONS`'s comment documents.
   */
  ADMIN_DASHBOARDS: {
    prefix: "/admin/dashboards",
    permissions: ["user:read", "dashboard:configure"],
  },
  /**
   * ⚠️ PROTOTYPE-ONLY — no BRD basis, unlike `ADMIN_DASHBOARDS` above. Same
   * permission, since it is the same actors (Super User directly,
   * Administrator via the wildcard) configuring dashboards — just a
   * different, prototype-parity screen for doing it.
   */
  ADMIN_DASHBOARD_BUILDER: {
    prefix: "/admin/dashboard-builder",
    permissions: ["user:read", "dashboard:configure"],
  },
  /**
   * §6 — "an Administrator can create custom roles with their own permissions
   * through the admin API" (`constants/roles.ts`). Administrator-only, same
   * reasoning as `ADMIN_AUDIT`/`ADMIN_SHIFT_CONFIG`: §6.5's Super User bullets
   * are silent on role management, and there is no named permission short of
   * the wildcard a custom role could hold to reach here without also being
   * able to grant itself anything.
   */
  ADMIN_ROLES: {
    prefix: "/admin/roles",
    permissions: [WILDCARD_PERMISSION],
  },
  /**
   * §7.6. `action:read` is held by Operator, Supervisor and Management, and
   * NOT by Super User — so this is one of the routes that produces §3's 403 for
   * a perfectly valid token, at the API as well as here (FR-ADM-03).
   *
   * **`shift:read` is listed because the route inherits it, not because the
   * screen wants it.** `/actions` sits inside the `(user)` route group, whose
   * layout guard requires `shift:read`, so entering it really needs both. An
   * entry that recorded only the leaf permission was a live infinite redirect:
   * `homeForSession(["action:read"])` returned `/actions`, the group guard
   * denied it, and `RoleGuard` redirected to `homeForSession` — the same route,
   * for ever. No base role could reach that state, but **FR-ADM-02**'s
   * Admin-created custom roles can, and `constants/permissions.ts` is explicit
   * that this build cannot name every permission set the backend may send.
   *
   * The rule this encodes: **a policy must record a route's *effective*
   * requirement — its own plus every ancestor guard's** — because
   * `homeForSession`, the sidebar filter and the edge proxy all answer from
   * this table alone and none of them can see a layout. `access.test.ts` pins
   * it.
   */
  ACTIONS: {
    prefix: "/actions",
    permissions: ["shift:read", "action:read"],
  },
  /**
   * §7.2 — the FR-HOME-01 dashboard.
   *
   * `shift:read` is both its own requirement and the `(user)` group's, so the
   * effective list is a single permission. There is deliberately **no
   * `dashboard:read`**: `constants/permissions.ts` has no such entry, and the
   * one it does have for Super User — `dashboard:configure` — is the right to
   * *configure* someone else's dashboard (FR-ADM-06), not to view this one.
   *
   * PROVISIONAL, on the same terms as the entries above: `shift:read` is the
   * defensible reading because every operational role holds it and Super User
   * holds none of it, but no requirement says in words which permission gates
   * this screen.
   */
  DASHBOARD: { prefix: "/dashboard", permissions: ["shift:read"] },
  /**
   * §7.5 — shift summaries. Two permissions for the same reason `ACTIONS` has
   * two: the screen wants `summary:read`, and the `(user)` layout it nests
   * inside demands `shift:read`. Recording only the leaf here would rebuild the
   * infinite redirect described above — this is the entry that would have
   * repeated it.
   */
  SUMMARIES: {
    prefix: "/summaries",
    permissions: ["shift:read", "summary:read"],
  },
  /**
   * §7.4 — the assistant. Two permissions for the reason the entries above
   * carry two: the screen wants `assistant:query`, and the `(user)` layout it
   * nests inside demands `shift:read`.
   *
   * `assistant:query` is held by Operator, Supervisor and Management, and not by
   * Super User — so this is another route that answers §3's 403 for a perfectly
   * valid token, at the API as well as here (FR-ADM-03).
   */
  ASSISTANT: {
    prefix: "/assistant",
    permissions: ["shift:read", "assistant:query"],
  },
  /**
   * §7.7 — trends & KPIs (**FR-AN-02**), and the trend half of **FR-REP-01**.
   *
   * **`report:read`, not `analytics:read`.** `constants/permissions.ts` gives
   * `report:read` to Supervisor and Management, and to the Administrator
   * through the wildcard; Operator and Super User hold neither. That set is the
   * prototype's nav exactly — `SUPNAV` (app-source.txt 3) carries
   * `['trends','Trends & KPIs']` for all five Supervisor variants, all four
   * Superintendent roles and `admin` carry it too, and the two navs without it
   * are `operator` (5) and `superuser` (16).
   *
   * `analytics:read` is the tempting alternative and it is **wrong**: §6 grants
   * it to Management alone, so it would lock every Supervisor out of a screen
   * the BRD twice puts in their hands. §6.2, verbatim: "Supervisor access
   * includes: Supervisor dashboard · Pending Actions · Shift Summary Report ·
   * Ask Assistant · Notifications · Decision Workflow · **KPI Reports · Trend
   * Reports / Trend Analysis**." **FR-REP-01** — "Generate operational and
   * management reports — shift-summary, **trend**, pending-action,
   * safety/compliance" — lists "Management, **Supervisor**" in its primary-role
   * column, and v1.3's own changelog records v1.2 as having "expanded
   * Supervisor access (**KPI & trend reports**, decision workflow)".
   *
   * That last point is the one worth stating plainly, because §7.7 reads the
   * other way at a glance: FR-AN-01…06 all say "Management" under *Primary
   * roles*. Primary is not exclusive — FR-REP-01 names both roles for the same
   * artefact, and §6.2 names Supervisor in prose — so the column describes who
   * the requirement was written for, not who may open the page. Gating on
   * `analytics:read` would turn a soft column heading into a hard denial and
   * contradict §6.2.
   *
   * `shift:read` rides along under the **effective-requirement rule** the
   * `ACTIONS` entry documents: `/trends` sits in the `(user)` route group,
   * whose layout guard demands `shift:read`, so entering it really needs both.
   * An entry naming only the leaf would admit a custom role (**FR-ADM-02**)
   * holding `report:read` alone and then have the group guard bounce it — the
   * infinite redirect. Both roles that reach this screen hold `shift:read`
   * anyway, so this costs nothing and closes the same hole.
   *
   * **PROVISIONAL**, on the same terms as every entry in this table and for a
   * reason worth being explicit about: **the BRD does not say which permission
   * gates this screen.** It never mentions a permission string at all — the
   * `report:read` / `analytics:read` vocabulary is `authentication_flow.md`
   * §6's, and §6 does not map either one to a route. What the BRD does give is
   * *which roles* may see trends, and `report:read` is the only permission in
   * §6 whose holders match that set. That is an inference from two documents,
   * not a quoted requirement, and it needs client confirmation.
   */
  TRENDS: {
    prefix: "/trends",
    permissions: ["shift:read", "report:read"],
  },
  /**
   * §7.9 — notifications. **FR-NOT-01 is "All roles"**, so this is gated on
   * nothing beyond the `(user)` group's own `shift:read`.
   *
   * That does leave Super User out, and it is the one role the requirement's
   * "All roles" and this build's permission table genuinely disagree about:
   * Super User holds no operational permission at all, so there is no session
   * shape that reaches this route without also reaching the rest of the
   * operational tree. Flagged rather than resolved by inventing a permission.
   */
  NOTIFICATIONS: { prefix: "/notifications", permissions: ["shift:read"] },
  LOGBOOK: { prefix: "/logbook", permissions: ["shift:read"] },
} as const satisfies Record<string, RoutePolicy>;

/**
 * Where a session may land, most privileged first. `homeForSession` returns the
 * first entry the session can actually reach, which is what keeps a redirect
 * from targeting a route that would bounce it straight back.
 *
 * **FR-AUTH-01** — "map to a role and redirect to a role-based dashboard" — is
 * satisfied by `/dashboard`, which is why it is here. `/actions` held the slot
 * as an acknowledged stand-in through Phase 1a; a pending-actions list is one
 * quarter of what FR-HOME-01 defines a dashboard to be, and that shortfall is
 * now closed.
 *
 * `/actions` is **not** a candidate any more, and its absence is deliberate
 * rather than an oversight. It requires `shift:read` *and* `action:read`, while
 * `/dashboard` requires only `shift:read` — so every session that could ever
 * have landed on `/actions` reaches `/dashboard` first and the entry could never
 * be selected. A permanently unreachable row in a policy table reads like a live
 * fallback to the next person, which is worse than no row.
 *
 * `/admin/users` stays **first** so an Administrator lands in the admin tree
 * rather than on the operations dashboard, and stays *at all* because it is
 * gated on `user:read`, which Super User holds — and Super User holds *nothing
 * else that opens any route*. Removing it would send a legitimate role to the §5
 * access-denied screen. Phase 3 replaces it with the real admin screens.
 *
 * `/logbook` was here once. It is the entries scaffold, whose `/entries`
 * endpoint has no mock handler, so an Operator signing in landed on a
 * connection-error toast as the first thing they saw.
 */
export const HOME_CANDIDATES: readonly string[] = [
  ROUTES.ADMIN.USERS,
  ROUTES.DASHBOARD,
];
