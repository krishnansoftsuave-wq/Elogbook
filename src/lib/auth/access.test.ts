import { describe, expect, it } from "vitest";

import { ROLE_PERMISSIONS } from "@/constants/permissions";
import { ROLES, ROLE_VALUES } from "@/constants/roles";
import { HOME_CANDIDATES, ROUTES } from "@/constants/routes";
import {
  canAccess,
  homeForSession,
  isProtectedRoute,
  requiredPermissionsFor,
} from "@/lib/auth/access";
import { unionPermissions } from "@/lib/auth/permissions";

/** The real §6 permission list for a role, never a hand-typed subset. */
const permissionsFor = (...roles: readonly (typeof ROLE_VALUES)[number][]) =>
  unionPermissions(roles);

describe("requiredPermissionsFor", () => {
  it("covers a prefix and everything beneath it", () => {
    expect(requiredPermissionsFor("/admin")).toEqual(["user:read"]);
    expect(requiredPermissionsFor("/admin/users/add")).toEqual(["user:read"]);
    expect(requiredPermissionsFor("/logbook")).toEqual(["shift:read"]);
    expect(requiredPermissionsFor("/logbook/42/preview")).toEqual([
      "shift:read",
    ]);
  });

  it("requires nothing of a route no policy covers", () => {
    expect(requiredPermissionsFor(ROUTES.LOGIN)).toEqual([]);
    expect(requiredPermissionsFor(ROUTES.ACCESS_DENIED)).toEqual([]);
    expect(requiredPermissionsFor(ROUTES.HOME)).toEqual([]);
  });

  it("does not match a route that merely starts with the same letters", () => {
    expect(requiredPermissionsFor("/administration")).toEqual([]);
    expect(requiredPermissionsFor("/logbooks")).toEqual([]);
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

  it("sends every operational role to the logbook", () => {
    expect(homeForSession(permissionsFor(ROLES.OPERATOR))).toBe(ROUTES.LOGBOOK);
    expect(homeForSession(permissionsFor(ROLES.SUPERVISOR))).toBe(
      ROUTES.LOGBOOK
    );
    expect(homeForSession(permissionsFor(ROLES.MANAGEMENT))).toBe(
      ROUTES.LOGBOOK
    );
  });

  it("prefers the most privileged reachable home for a multi-role session", () => {
    expect(
      homeForSession(permissionsFor(ROLES.OPERATOR, ROLES.SUPER_USER))
    ).toBe(ROUTES.ADMIN.USERS);
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
      for (const target of ["/admin/users", "/logbook", "/logbook/add"]) {
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
