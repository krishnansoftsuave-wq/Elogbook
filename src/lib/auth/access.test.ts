import { describe, expect, it } from "vitest";

import { ROLE_PERMISSIONS, type Permission } from "@/constants/permissions";
import { ROLES, ROLE_VALUES } from "@/constants/roles";
import { HOME_CANDIDATES, ROUTES } from "@/constants/routes";
import {
  canAccess,
  homeForSession,
  isProtectedRoute,
  requiredPermissionsFor,
} from "@/lib/auth/access";
import { hasPermission, unionPermissions } from "@/lib/auth/permissions";

/** The real §6 permission list for a role, never a hand-typed subset. */
const permissionsFor = (...roles: readonly (typeof ROLE_VALUES)[number][]) =>
  unionPermissions(roles);

describe("requiredPermissionsFor", () => {
  it("covers a prefix and everything beneath it", () => {
    expect(requiredPermissionsFor("/admin")).toEqual(["user:read"]);
    expect(
      requiredPermissionsFor("/admin/users/said.albusaidi/preview")
    ).toEqual(["user:read"]);
    expect(requiredPermissionsFor("/logbook")).toEqual(["shift:read"]);
    expect(requiredPermissionsFor("/logbook/42/preview")).toEqual([
      "shift:read",
    ]);
    expect(requiredPermissionsFor("/actions")).toEqual([
      "shift:read",
      "action:read",
    ]);
    expect(requiredPermissionsFor("/actions/ACT-2041")).toEqual([
      "shift:read",
      "action:read",
    ]);
    expect(requiredPermissionsFor("/dashboard")).toEqual(["shift:read"]);
    expect(requiredPermissionsFor("/summaries")).toEqual([
      "shift:read",
      "summary:read",
    ]);
    expect(requiredPermissionsFor("/summaries/SUM-20260731-D")).toEqual([
      "shift:read",
      "summary:read",
    ]);
    expect(requiredPermissionsFor("/assistant")).toEqual([
      "shift:read",
      "assistant:query",
    ]);
    expect(requiredPermissionsFor("/trends")).toEqual([
      "shift:read",
      "report:read",
    ]);
    // FR-NOT-01 is "All roles", so nothing narrower than the group's own guard.
    expect(requiredPermissionsFor("/notifications")).toEqual(["shift:read"]);
  });

  /**
   * The rule Phase 1a's infinite redirect established: a policy records a
   * route's **effective** requirement — its own plus every ancestor guard's —
   * because `homeForSession`, the sidebar filter and the edge proxy all answer
   * from this table and none of them can see a layout.
   *
   * Both 1b routes nest inside the `(user)` group, so both must carry its
   * `shift:read`. `/summaries` is the one that would have repeated the bug.
   */
  it("records the ancestor group's permission, not only the leaf's", () => {
    for (const route of [
      "/dashboard",
      "/summaries",
      "/actions",
      "/assistant",
      "/trends",
      "/notifications",
    ]) {
      expect(requiredPermissionsFor(route)).toContain("shift:read");
    }
  });

  /**
   * The longest matching prefix wins. `/admin/workflows` is the first policy in
   * this table nested inside another, and it is the case the sort in
   * `requiredPermissionsFor` was written for — without it the answer would
   * depend on object key order, which nothing guarantees.
   */
  it("lets a nested policy override the one above it", () => {
    expect(requiredPermissionsFor("/admin/workflows")).toEqual([
      "user:read",
      "access:control",
    ]);
    expect(requiredPermissionsFor("/admin/users")).toEqual(["user:read"]);
    // Everything beneath the nested prefix inherits the narrower rule too.
    expect(requiredPermissionsFor("/admin/workflows/anything")).toEqual([
      "user:read",
      "access:control",
    ]);
    expect(requiredPermissionsFor("/admin/audit")).toEqual(["*"]);
    expect(requiredPermissionsFor("/admin/shift-config")).toEqual(["*"]);
  });

  it("requires nothing of a route no policy covers", () => {
    expect(requiredPermissionsFor(ROUTES.LOGIN)).toEqual([]);
    expect(requiredPermissionsFor(ROUTES.ACCESS_DENIED)).toEqual([]);
    expect(requiredPermissionsFor(ROUTES.HOME)).toEqual([]);
  });

  it("does not match a route that merely starts with the same letters", () => {
    expect(requiredPermissionsFor("/administration")).toEqual([]);
    expect(requiredPermissionsFor("/logbooks")).toEqual([]);
    expect(requiredPermissionsFor("/actionsomething")).toEqual([]);
    expect(requiredPermissionsFor("/trending")).toEqual([]);
  });
});

describe("isProtectedRoute", () => {
  it("is true exactly where a permission is required", () => {
    expect(isProtectedRoute("/admin")).toBe(true);
    expect(isProtectedRoute("/admin/users/add")).toBe(true);
    expect(isProtectedRoute("/logbook")).toBe(true);
  });

  it("leaves the sign-in surface and the root open", () => {
    expect(isProtectedRoute(ROUTES.LOGIN)).toBe(false);
    expect(isProtectedRoute(ROUTES.CALLBACK)).toBe(false);
    expect(isProtectedRoute(ROUTES.ACCESS_DENIED)).toBe(false);
    expect(isProtectedRoute(ROUTES.HOME)).toBe(false);
    expect(isProtectedRoute("/administration")).toBe(false);
  });
});

describe("canAccess", () => {
  it("lets anyone through a route that requires nothing", () => {
    expect(canAccess(null, ROUTES.LOGIN)).toBe(true);
    expect(canAccess([], ROUTES.ACCESS_DENIED)).toBe(true);
  });

  it("blocks an anonymous visitor from every protected route", () => {
    expect(canAccess(null, "/logbook")).toBe(false);
    expect(canAccess(undefined, "/logbook")).toBe(false);
    expect(canAccess([], "/admin/users")).toBe(false);
  });

  it("lets the administrator wildcard reach everywhere", () => {
    const administrator = permissionsFor(ROLES.ADMINISTRATOR);
    expect(administrator).toEqual(["*"]);
    for (const path of [...HOME_CANDIDATES, "/logbook/add", "/admin/users"]) {
      expect(canAccess(administrator, path)).toBe(true);
    }
  });

  it("lets an operator into the logbook but not the admin tree", () => {
    const operator = permissionsFor(ROLES.OPERATOR);
    expect(canAccess(operator, "/logbook")).toBe(true);
    expect(canAccess(operator, "/logbook/add")).toBe(true);
    expect(canAccess(operator, "/admin/users")).toBe(false);
  });

  /**
   * §7.10. **The Super User belongs on the workflow screen**, and this entry was
   * wrong once in the other direction: it required the wildcard, on the strength
   * of §6.5's *fifth* bullet ("Can view users"). Its **fourth** bullet is
   * *"Control access to comments and the decision workflow"*, and **FR-ADM-06**,
   * **FR-DASH-03** and the §4 role table all say the same.
   *
   * `access:control` is the permission §6 grants them for exactly this, and it
   * gated nothing anywhere in the app until now. *Which* of the four switches a
   * session may flip is `WORKFLOW_PERMISSION`'s job — a route gate cannot say.
   */
  it("admits both admin-tree roles to /admin/workflows and nobody else", () => {
    for (const role of [ROLES.SUPER_USER, ROLES.ADMINISTRATOR]) {
      expect(canAccess(permissionsFor(role), "/admin/users")).toBe(true);
      expect(canAccess(permissionsFor(role), "/admin/workflows")).toBe(true);
    }

    for (const role of [ROLES.OPERATOR, ROLES.SUPERVISOR, ROLES.MANAGEMENT]) {
      expect(canAccess(permissionsFor(role), "/admin/workflows")).toBe(false);
    }
  });

  /**
   * The effective-permission rule, on the entry that would have broken it: a
   * custom role holding `access:control` alone passes the leaf policy but would
   * be bounced by the `(admin)` group guard above it — the infinite redirect
   * `ACTIONS` documents. Listing `user:read` too is what prevents that.
   */
  it("refuses access:control alone, because the admin group guard would", () => {
    expect(canAccess(["access:control"], "/admin/workflows")).toBe(false);
    expect(canAccess(["access:control", "user:read"], "/admin/workflows")).toBe(
      true
    );
  });

  /**
   * §7.11 and §7.2 — **Administrator-only**, one phase after `ADMIN_WORKFLOWS`
   * was deliberately walked back *from* the wildcard. That is the same test
   * giving the opposite answer: the BRD names the Super User for comment and
   * decision-workflow access four times over, and for audit or shift timings
   * **zero** times. §6.4 lists both under the Administrator instead.
   */
  it("keeps a Super User out of the audit log and the shift timings", () => {
    const superUser = permissionsFor(ROLES.SUPER_USER);
    expect(canAccess(superUser, "/admin/users")).toBe(true);
    expect(canAccess(superUser, "/admin/workflows")).toBe(true);
    expect(canAccess(superUser, "/admin/audit")).toBe(false);
    expect(canAccess(superUser, "/admin/shift-config")).toBe(false);

    const administrator = permissionsFor(ROLES.ADMINISTRATOR);
    expect(canAccess(administrator, "/admin/audit")).toBe(true);
    expect(canAccess(administrator, "/admin/shift-config")).toBe(true);
  });

  it("keeps every operational role out of both", () => {
    for (const role of [ROLES.OPERATOR, ROLES.SUPERVISOR, ROLES.MANAGEMENT]) {
      expect(canAccess(permissionsFor(role), "/admin/audit")).toBe(false);
      expect(canAccess(permissionsFor(role), "/admin/shift-config")).toBe(
        false
      );
    }
  });

  /**
   * §7.6's screen. `action:read` is held by the three operational roles and not
   * by Super User, which is what makes `/actions` the UI half of the same 403
   * `GET /api/v1/actions` produces for a perfectly valid token (FR-ADM-03).
   */
  it("opens /actions to the operational roles and refuses Super User", () => {
    for (const role of [ROLES.OPERATOR, ROLES.SUPERVISOR, ROLES.MANAGEMENT]) {
      expect(canAccess(permissionsFor(role), "/actions")).toBe(true);
      expect(canAccess(permissionsFor(role), "/actions/ACT-2041")).toBe(true);
    }
    expect(canAccess(permissionsFor(ROLES.SUPER_USER), "/actions")).toBe(false);
    expect(canAccess(permissionsFor(ROLES.ADMINISTRATOR), "/actions")).toBe(
      true
    );
  });

  /**
   * §7.5's screen. `summary:read` is held by Operator, Supervisor and Management
   * — FR-SUM-07 shows summaries to "All roles" — and not by Super User, whose
   * permissions are configuration rights rather than operational reads.
   */
  it("opens /summaries to the operational roles and refuses Super User", () => {
    for (const role of [ROLES.OPERATOR, ROLES.SUPERVISOR, ROLES.MANAGEMENT]) {
      expect(canAccess(permissionsFor(role), "/summaries")).toBe(true);
      expect(canAccess(permissionsFor(role), "/summaries/SUM-20260731-D")).toBe(
        true
      );
      expect(canAccess(permissionsFor(role), "/dashboard")).toBe(true);
    }
    expect(canAccess(permissionsFor(ROLES.SUPER_USER), "/summaries")).toBe(
      false
    );
    expect(canAccess(permissionsFor(ROLES.SUPER_USER), "/dashboard")).toBe(
      false
    );
    expect(canAccess(permissionsFor(ROLES.ADMINISTRATOR), "/summaries")).toBe(
      true
    );
  });

  /**
   * §7.4's screen. `assistant:query` is held by Operator, Supervisor and
   * Management — §6.1 and §6.2 both list "Ask Assistant" — and not by Super
   * User, whose permissions are configuration rights.
   */
  it("opens /assistant to the operational roles and refuses Super User", () => {
    for (const role of [ROLES.OPERATOR, ROLES.SUPERVISOR, ROLES.MANAGEMENT]) {
      expect(canAccess(permissionsFor(role), "/assistant")).toBe(true);
    }
    expect(canAccess(permissionsFor(ROLES.SUPER_USER), "/assistant")).toBe(
      false
    );
    expect(canAccess(permissionsFor(ROLES.ADMINISTRATOR), "/assistant")).toBe(
      true
    );
  });

  /**
   * §7.7's screen — **FR-AN-02**'s trend dashboard, gated on `report:read`.
   *
   * The three roles that reach it are Supervisor, Management and Administrator,
   * which is the prototype's nav exactly: `SUPNAV` carries Trends & KPIs for
   * every Supervisor variant, the four Superintendent roles and `admin` carry
   * it, and the two navs without it are `operator` and `superuser`.
   *
   * Operator is excluded by the permission table rather than by choice — §6
   * grants `report:read` to Supervisor and Management, and §6.1's Operator flow
   * never mentions trends. Super User is excluded for the reason it is excluded
   * everywhere in the operational tree: its permissions are configuration
   * rights, and it holds no `shift:read` either.
   */
  it("opens /trends to supervisor, management and administrator only", () => {
    for (const role of [
      ROLES.SUPERVISOR,
      ROLES.MANAGEMENT,
      ROLES.ADMINISTRATOR,
    ]) {
      expect(canAccess(permissionsFor(role), ROUTES.TRENDS)).toBe(true);
    }

    for (const role of [ROLES.OPERATOR, ROLES.SUPER_USER]) {
      expect(canAccess(permissionsFor(role), ROUTES.TRENDS)).toBe(false);
    }
  });

  /**
   * The reasoning behind the entry, pinned against the real §6 table rather
   * than restated in a comment: `report:read` selects exactly the three roles
   * above, and `analytics:read` — the alternative this entry deliberately does
   * **not** use — is Management-only, so choosing it would have locked out the
   * Supervisor whom §6.2 grants "Trend Reports / Trend Analysis" and FR-REP-01
   * names for trend reports.
   */
  it("uses the permission that admits Supervisor, not the one that does not", () => {
    const holders = (permission: Permission) =>
      ROLE_VALUES.filter((role) =>
        hasPermission(permissionsFor(role), [permission])
      );

    expect(holders("report:read")).toEqual([
      ROLES.SUPERVISOR,
      ROLES.MANAGEMENT,
      ROLES.ADMINISTRATOR,
    ]);
    // §6.2 and FR-REP-01 both put trends in Supervisor's hands; this is why
    // `analytics:read` is the wrong gate for this screen.
    expect(holders("analytics:read")).not.toContain(ROLES.SUPERVISOR);
  });

  /**
   * The effective-requirement rule on the newest entry. A custom role
   * (**FR-ADM-02**) holding `report:read` alone passes the leaf policy but the
   * `(user)` group guard above `/trends` demands `shift:read` — recording only
   * the leaf would rebuild the infinite redirect `ACTIONS` documents.
   */
  it("refuses report:read alone, because the user group guard would", () => {
    expect(canAccess(["report:read"], ROUTES.TRENDS)).toBe(false);
    expect(canAccess(["report:read", "shift:read"], ROUTES.TRENDS)).toBe(true);
  });

  /**
   * §7.9. **FR-NOT-01 is "All roles"** and every operational role holds
   * `shift:read`, so all three reach it.
   *
   * Super User does not, and that is the one place this build's permission table
   * and the requirement's "All roles" genuinely disagree — Super User holds no
   * operational permission at all. Pinned so the disagreement stays visible
   * rather than being discovered later as a bug.
   */
  it("opens /notifications to every operational role", () => {
    for (const role of [ROLES.OPERATOR, ROLES.SUPERVISOR, ROLES.MANAGEMENT]) {
      expect(canAccess(permissionsFor(role), "/notifications")).toBe(true);
    }
    expect(
      canAccess(permissionsFor(ROLES.ADMINISTRATOR), "/notifications")
    ).toBe(true);
    expect(canAccess(permissionsFor(ROLES.SUPER_USER), "/notifications")).toBe(
      false
    );
  });

  it("lets a super user into the admin tree but not the logbook", () => {
    // The inverse case, and the one a role-precedence list got wrong before:
    // `super_user` holds `user:read` and no `shift:read`.
    const superUser = permissionsFor(ROLES.SUPER_USER);
    expect(canAccess(superUser, "/admin/users")).toBe(true);
    expect(canAccess(superUser, "/logbook")).toBe(false);
  });

  it("combines the permissions of a multi-role session (FR-AUTH-03)", () => {
    const both = permissionsFor(ROLES.OPERATOR, ROLES.SUPER_USER);
    expect(canAccess(both, "/logbook")).toBe(true);
    expect(canAccess(both, "/admin/users")).toBe(true);
  });

  it("accepts a permission this build has never heard of without crashing", () => {
    // A custom role created through the admin API (§6) sends arbitrary
    // strings; they must simply not match, never throw.
    expect(canAccess(["chaos:engineer"], "/logbook")).toBe(false);
    expect(canAccess(["chaos:engineer", "shift:read"], "/logbook")).toBe(true);
  });
});

describe("homeForSession", () => {
  it("sends a session holding user:read to the admin tree", () => {
    expect(homeForSession(permissionsFor(ROLES.SUPER_USER))).toBe(
      ROUTES.ADMIN.USERS
    );
    expect(homeForSession(permissionsFor(ROLES.ADMINISTRATOR))).toBe(
      ROUTES.ADMIN.USERS
    );
  });

  /**
   * **FR-AUTH-01** — "map to a role and redirect to a role-based dashboard".
   *
   * `/logbook` held this slot first (the entries scaffold, whose `/entries`
   * endpoint has no handler — a connection-error toast as the first thing an
   * Operator saw), then `/actions` as an acknowledged stand-in through Phase 1a.
   * A pending-actions list is one quarter of what FR-HOME-01 calls a dashboard;
   * `/dashboard` is the requirement actually met.
   */
  it("sends every operational role to the dashboard (FR-AUTH-01)", () => {
    for (const role of [ROLES.OPERATOR, ROLES.SUPERVISOR, ROLES.MANAGEMENT]) {
      expect(homeForSession(permissionsFor(role))).toBe(ROUTES.DASHBOARD);
    }
  });

  it("no longer routes anyone to the entries scaffold", () => {
    expect(HOME_CANDIDATES).not.toContain(ROUTES.LOGBOOK);
  });

  /**
   * `/actions` was removed from the candidate list rather than left behind it.
   * It requires `shift:read` **and** `action:read`; `/dashboard` requires only
   * `shift:read` and sits ahead of it — so no session could ever have reached
   * the `/actions` entry, and a permanently unreachable row in a policy table
   * reads to the next person like a live fallback.
   */
  it("drops the candidate /dashboard strictly dominates", () => {
    expect(HOME_CANDIDATES).not.toContain(ROUTES.ACTIONS);

    for (const permissions of [
      ["shift:read"],
      ["shift:read", "action:read"],
      ["shift:read", "summary:read", "action:read"],
    ]) {
      expect(homeForSession(permissions)).not.toBe(ROUTES.ACTIONS);
    }
  });

  /**
   * The reason `/admin/users` stays in `HOME_CANDIDATES` despite having the same
   * missing-endpoint problem: `user:read` is the *only* permission Super User
   * holds that opens any route at all. Drop it and a legitimate role lands on
   * the §5 deny screen.
   */
  it("keeps a home for Super User, whose only route is the admin tree", () => {
    const superUser = permissionsFor(ROLES.SUPER_USER);
    expect(homeForSession(superUser)).toBe(ROUTES.ADMIN.USERS);
    expect(homeForSession(superUser)).not.toBe(ROUTES.ACCESS_DENIED);
  });

  it("prefers the most privileged reachable home for a multi-role session", () => {
    expect(
      homeForSession(permissionsFor(ROLES.OPERATOR, ROLES.SUPER_USER))
    ).toBe(ROUTES.ADMIN.USERS);
  });

  /**
   * The invariant this module's docblock claims: every route `homeForSession`
   * returns has just been approved by `canAccess`, so a guard that redirects
   * here can never send a session somewhere the same guard bounces it from.
   *
   * It was briefly false. `/actions` lives inside the `(user)` route group,
   * whose layout guard requires `shift:read`, but its policy recorded only
   * `action:read` — so a session holding `action:read` alone was sent to
   * `/actions`, denied by the group guard, and redirected to `/actions` again.
   * An infinite replace loop, reachable by any FR-ADM-02 custom role.
   *
   * This walks permission sets the base-role table cannot produce, precisely
   * because §6 says the backend can send sets this build has never seen.
   */
  it("never returns a home the route's own policy would refuse", () => {
    const SETS: readonly string[][] = [
      ["action:read"],
      ["shift:read"],
      ["user:read"],
      ["action:read", "user:read"],
      ["shift:read", "action:read"],
      // Phase 1b's additions. `summary:read` alone is the shape that would
      // have looped on `/summaries` had its policy recorded only the leaf.
      ["summary:read"],
      ["summary:read", "user:read"],
      ["shift:read", "summary:read"],
      // Phase 1c's.
      ["assistant:query"],
      ["shift:read", "assistant:query"],
      ["chaos:engineer"],
      ["*"],
      [],
    ];

    for (const permissions of SETS) {
      const home = homeForSession(permissions);
      if (home === ROUTES.ACCESS_DENIED) continue;

      // Whatever it returned must be enterable — including every permission
      // an ancestor layout guard contributes.
      expect(
        canAccess(permissions, home),
        `homeForSession(${JSON.stringify(permissions)}) returned ${home}, which it cannot enter`
      ).toBe(true);
    }
  });

  it("sends an action:read-only session to the deny screen, not into a loop", () => {
    // It can enter neither `/admin/users` nor `/dashboard` (which needs
    // `shift:read`), so the chain must terminate rather than bounce.
    expect(homeForSession(["action:read"])).toBe(ROUTES.ACCESS_DENIED);
  });

  it("sends an assistant:query-only session to the deny screen, not into a loop", () => {
    expect(homeForSession(["assistant:query"])).toBe(ROUTES.ACCESS_DENIED);
  });

  it("sends a summary:read-only session to the deny screen, not into a loop", () => {
    // The same shape for 1b: `/summaries` needs `shift:read` as well, so a
    // custom role (FR-ADM-02) holding only the leaf must terminate.
    expect(homeForSession(["summary:read"])).toBe(ROUTES.ACCESS_DENIED);
  });

  /**
   * `shift:read` alone opens `/dashboard` and nothing else — which is the whole
   * point of gating the dashboard on the permission every operational role
   * holds. A custom role with just that must land somewhere real.
   */
  it("gives a shift:read-only custom role the dashboard", () => {
    expect(homeForSession(["shift:read"])).toBe(ROUTES.DASHBOARD);
    expect(canAccess(["shift:read"], ROUTES.DASHBOARD)).toBe(true);
    expect(canAccess(["shift:read"], ROUTES.SUMMARIES)).toBe(false);
  });

  it("falls back to the access-denied screen, never to /unauthorized", () => {
    // A token that opens no door at all is §5's unmapped account. The screen
    // says so; a dead-end error page would not.
    for (const permissions of [null, undefined, [], ["chaos:engineer"]]) {
      const home = homeForSession(permissions);
      expect(home).toBe(ROUTES.ACCESS_DENIED);
      expect(home).not.toBe("/unauthorized");
    }
  });

  // The regression that a role→home table produced: `super_user`'s home sat in
  // a tree its own permissions could not enter, so the guard redirected there
  // and the guard there redirected back, forever.
  it.each(ROLE_VALUES)(
    "never sends %s somewhere it would bounce again",
    (role) => {
      const permissions = permissionsFor(role);
      const home = homeForSession(permissions);

      expect(canAccess(permissions, home)).toBe(true);
      // And landing there is stable: the home of the home is the home.
      expect(homeForSession(permissions)).toBe(home);
    }
  );

  it.each(ROLE_VALUES)(
    "gives %s a home it can reach from any protected route it is bounced off",
    (role) => {
      const permissions = permissionsFor(role);
      for (const target of [
        "/admin/users",
        "/logbook",
        "/logbook/add",
        "/dashboard",
        "/summaries",
        "/summaries/SUM-20260731-D",
      ]) {
        if (canAccess(permissions, target)) continue;
        expect(canAccess(permissions, homeForSession(permissions))).toBe(true);
      }
    }
  );

  it("keeps every base role out of a redirect loop for real permission data", () => {
    // Guards against ROLE_PERMISSIONS drifting away from ROUTE_PERMISSIONS:
    // every base role must have at least one reachable landing route.
    for (const role of ROLE_VALUES) {
      expect(Object.keys(ROLE_PERMISSIONS)).toContain(role);
      expect(homeForSession(permissionsFor(role))).not.toBe(
        ROUTES.ACCESS_DENIED
      );
    }
  });
});
