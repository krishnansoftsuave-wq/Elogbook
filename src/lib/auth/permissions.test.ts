import { describe, expect, it } from "vitest";

import { ROLE_PERMISSIONS } from "@/constants/permissions";
import { ROLES } from "@/constants/roles";
import {
  hasPermission,
  rolesForGroups,
  unionPermissions,
} from "@/lib/auth/permissions";

/**
 * Transcribed by hand from the `authentication_flow.md` §6 table so this test
 * fails if either side drifts. Do not derive it from `ROLE_PERMISSIONS` — a
 * derived expectation would agree with any mistake.
 */
const CONTRACT_TABLE = {
  operator: [
    "shift:read",
    "summary:read",
    "assistant:query",
    "action:read",
    "action:write",
  ],
  supervisor: [
    "shift:read",
    "summary:read",
    "summary:comment",
    "assistant:query",
    "action:read",
    "action:write",
    "action:confirm",
    "action:assign",
    "report:read",
  ],
  management: [
    "shift:read",
    "summary:read",
    "assistant:query",
    "action:read",
    "report:read",
    "analytics:read",
  ],
  administrator: ["*"],
  super_user: [
    "dashboard:configure",
    "widget:assign",
    "metric:control",
    "access:control",
    "user:read",
  ],
};

describe("ROLE_PERMISSIONS", () => {
  it("matches the contract's §6 table for every one of the five roles", () => {
    expect(ROLE_PERMISSIONS).toEqual(CONTRACT_TABLE);
  });

  it("leaves administrator as the bare wildcard rather than an expanded list", () => {
    expect(ROLE_PERMISSIONS.administrator).toEqual(["*"]);
  });

  it("covers exactly the five base roles and no invented sixth", () => {
    expect(Object.keys(ROLE_PERMISSIONS).sort()).toEqual([
      "administrator",
      "management",
      "operator",
      "super_user",
      "supervisor",
    ]);
  });
});

describe("hasPermission", () => {
  it("lets the wildcard satisfy anything, which is how §5 encodes administrator", () => {
    expect(hasPermission(["*"], "shift:read")).toBe(true);
    expect(hasPermission(["*"], "user:read")).toBe(true);
    expect(hasPermission(["*"], ["analytics:read", "action:assign"])).toBe(
      true
    );
  });

  it("grants a permission the session actually holds", () => {
    expect(hasPermission(["shift:read", "action:read"], "shift:read")).toBe(
      true
    );
  });

  it("refuses a permission the session does not hold", () => {
    expect(hasPermission(["shift:read"], "user:read")).toBe(false);
  });

  it("requires every entry when given a list, not merely one of them", () => {
    const held = ["shift:read", "summary:read"];
    expect(hasPermission(held, ["shift:read", "summary:read"])).toBe(true);
    expect(hasPermission(held, ["shift:read", "report:read"])).toBe(false);
  });

  it("treats an empty requirement as nothing to require", () => {
    expect(hasPermission(["shift:read"], [])).toBe(true);
  });

  it("fails closed for a session that is absent or still loading", () => {
    expect(hasPermission(null, "shift:read")).toBe(false);
    expect(hasPermission(undefined, "shift:read")).toBe(false);
    expect(hasPermission([], "shift:read")).toBe(false);
    expect(hasPermission([], [])).toBe(false);
  });

  it("does not treat a wildcard in the requirement as a skeleton key", () => {
    expect(hasPermission(["shift:read"], "*")).toBe(false);
  });
});

describe("unionPermissions", () => {
  it("returns a single role's permissions unchanged", () => {
    expect(unionPermissions([ROLES.OPERATOR])).toEqual(CONTRACT_TABLE.operator);
  });

  it("combines both roles' permissions for a multi-role user (FR-AUTH-03)", () => {
    const combined = unionPermissions([ROLES.OPERATOR, ROLES.MANAGEMENT]);
    expect(combined).toContain("action:write");
    expect(combined).toContain("analytics:read");
    expect(combined).toContain("report:read");
  });

  it("deduplicates permissions the roles share", () => {
    const combined = unionPermissions([ROLES.OPERATOR, ROLES.SUPERVISOR]);
    expect(combined.filter((p) => p === "shift:read")).toHaveLength(1);
  });

  it("collapses to the wildcard when any role is administrator", () => {
    expect(unionPermissions([ROLES.OPERATOR, ROLES.ADMINISTRATOR])).toEqual([
      "*",
    ]);
  });

  it("grants nothing when no role matched", () => {
    expect(unionPermissions([])).toEqual([]);
  });
});

describe("rolesForGroups", () => {
  it("maps each §6 AD group to its role", () => {
    expect(rolesForGroups(["OLNG-ELOG-OPERATORS"])).toEqual([ROLES.OPERATOR]);
    expect(rolesForGroups(["OLNG-ELOG-SUPERVISORS"])).toEqual([
      ROLES.SUPERVISOR,
    ]);
    expect(rolesForGroups(["OLNG-ELOG-SUPERINTENDENTS"])).toEqual([
      ROLES.MANAGEMENT,
    ]);
    expect(rolesForGroups(["OLNG-ELOG-ADMINS"])).toEqual([ROLES.ADMINISTRATOR]);
    expect(rolesForGroups(["OLNG-ELOG-SUPERUSERS"])).toEqual([
      ROLES.SUPER_USER,
    ]);
  });

  it("resolves every group a multi-group account belongs to", () => {
    expect(
      rolesForGroups(["OLNG-ELOG-OPERATORS", "OLNG-ELOG-SUPERINTENDENTS"])
    ).toEqual([ROLES.OPERATOR, ROLES.MANAGEMENT]);
  });

  it("drops groups that map to no role, which is what produces the §5 deny", () => {
    expect(rolesForGroups(["OLNG-CONTRACTORS"])).toEqual([]);
    expect(rolesForGroups(["OLNG-CONTRACTORS", "OLNG-ELOG-OPERATORS"])).toEqual(
      [ROLES.OPERATOR]
    );
  });

  it("does not resolve a role name passed where a group belongs", () => {
    expect(rolesForGroups(["operator", "administrator"])).toEqual([]);
  });

  // Regression: `groups` comes from token claims, so it is attacker-controlled.
  // `AD_GROUP_TO_ROLE["constructor"]` resolves to an inherited
  // `Object.prototype` member, which is truthy — a `Boolean(role)` filter let
  // it through as a role, and `unionPermissions` then threw
  // "ROLE_PERMISSIONS[role] is not iterable" on a forged group. Found by the
  // mock-transport lane; a 500 on `GET /me` reachable from the network.
  it.each([
    "__proto__",
    "constructor",
    "prototype",
    "toString",
    "valueOf",
    "hasOwnProperty",
  ])(
    "drops the inherited Object key %s instead of treating it as a role",
    (key) => {
      expect(rolesForGroups([key])).toEqual([]);
    }
  );

  it("survives a forged group without throwing", () => {
    expect(() =>
      unionPermissions(rolesForGroups(["constructor", "__proto__"]))
    ).not.toThrow();
    expect(unionPermissions(rolesForGroups(["constructor"]))).toEqual([]);
  });
});
