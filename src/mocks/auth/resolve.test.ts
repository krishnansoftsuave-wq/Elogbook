import { describe, expect, it } from "vitest";

import { AD_GROUP_VALUES } from "@/constants/roles";
import { meDataSchema } from "@/features/auth/schemas";
import {
  EXPIRED_TOKEN_MESSAGE,
  INVALID_TOKEN_MESSAGE,
  MISSING_BEARER_MESSAGE,
  UNMAPPED_ACCOUNT_MESSAGE,
  authenticate,
  forbiddenMessage,
  resolveSession,
  unknownGroups,
  unknownGroupsMessage,
} from "@/mocks/auth/resolve";
import {
  MOCK_TOKEN_TTL_SECONDS,
  encodeMockToken,
  mintMockToken,
  type MockTokenPayload,
} from "@/mocks/auth/token";

const payloadFor = (
  groups: readonly string[],
  overrides: Partial<MockTokenPayload> = {}
): MockTokenPayload => {
  const iat = Math.floor(Date.now() / 1000);
  return {
    subject: "dev|said.albusaidi",
    username: "said.albusaidi",
    display_name: "Said Al-Busaidi",
    groups: [...groups],
    iat,
    exp: iat + MOCK_TOKEN_TTL_SECONDS,
    ...overrides,
  };
};

const bearerFor = (
  groups: readonly string[],
  overrides: Partial<MockTokenPayload> = {}
): string => `Bearer ${encodeMockToken(payloadFor(groups, overrides))}`;

describe("resolveSession — group to role to permission", () => {
  it("resolves an operator's group to the §6 operator permissions", () => {
    const session = resolveSession(payloadFor(["OLNG-ELOG-OPERATORS"]));

    expect(session?.roles).toEqual(["operator"]);
    expect(session?.permissions).toEqual([
      "shift:read",
      "summary:read",
      "assistant:query",
      "action:read",
      "action:write",
    ]);
  });

  it("resolves a supervisor's group to the §6 supervisor permissions", () => {
    const session = resolveSession(payloadFor(["OLNG-ELOG-SUPERVISORS"]));

    expect(session?.roles).toEqual(["supervisor"]);
    expect(session?.permissions).toContain("action:confirm");
    expect(session?.permissions).toContain("summary:comment");
  });

  it("resolves a superintendent's group to management, the only base role with analytics:read", () => {
    const session = resolveSession(payloadFor(["OLNG-ELOG-SUPERINTENDENTS"]));

    expect(session?.roles).toEqual(["management"]);
    expect(session?.permissions).toContain("analytics:read");
    expect(session?.permissions).not.toContain("action:write");
  });

  it("resolves an admin's group to the bare wildcard, never an expanded list", () => {
    const session = resolveSession(payloadFor(["OLNG-ELOG-ADMINS"]));

    expect(session?.roles).toEqual(["administrator"]);
    expect(session?.permissions).toEqual(["*"]);
  });

  it("resolves a super user's group to user:read but not shift:read", () => {
    const session = resolveSession(payloadFor(["OLNG-ELOG-SUPERUSERS"]));

    expect(session?.roles).toEqual(["super_user"]);
    expect(session?.permissions).toContain("user:read");
    expect(session?.permissions).not.toContain("shift:read");
  });

  it("unions permissions across both roles for a multi-group account (FR-AUTH-03)", () => {
    const session = resolveSession(
      payloadFor(["OLNG-ELOG-OPERATORS", "OLNG-ELOG-SUPERINTENDENTS"])
    );

    expect(session?.roles).toEqual(["operator", "management"]);
    // action:write is operator-only, analytics:read is management-only.
    expect(session?.permissions).toContain("action:write");
    expect(session?.permissions).toContain("analytics:read");
    // shift:read is in both and must appear once.
    expect(session?.permissions.filter((p) => p === "shift:read")).toHaveLength(
      1
    );
  });

  it("returns the raw groups for reference, including ones that mapped to nothing", () => {
    const session = resolveSession(
      payloadFor(["OLNG-ELOG-OPERATORS", "OLNG-CONTRACTORS"])
    );

    expect(session?.groups).toEqual([
      "OLNG-ELOG-OPERATORS",
      "OLNG-CONTRACTORS",
    ]);
    expect(session?.roles).toEqual(["operator"]);
  });

  it("produces exactly the seven §5 fields, and the client's own schema accepts them", () => {
    const session = resolveSession(payloadFor(["OLNG-ELOG-OPERATORS"]));

    expect(Object.keys(session ?? {}).sort()).toEqual([
      "area_scope",
      "display_name",
      "groups",
      "permissions",
      "roles",
      "subject",
      "username",
    ]);
    expect(meDataSchema.safeParse(session).success).toBe(true);
  });

  it("scopes every base role to the full plant, per §5 null and BRD §9.2", () => {
    for (const group of AD_GROUP_VALUES) {
      expect(resolveSession(payloadFor([group]))?.area_scope).toBeNull();
    }
  });

  it("still accepts a non-null area_scope on the wire, for a future custom role", () => {
    const scoped = { ...resolveSession(payloadFor(["OLNG-ELOG-OPERATORS"])) };
    scoped.area_scope = ["Train 1"];

    expect(meDataSchema.safeParse(scoped).success).toBe(true);
  });
});

describe("resolveSession — the §5 deny path", () => {
  it("returns null when the groups map to no role at all (BE-US001-5)", () => {
    expect(resolveSession(payloadFor(["OLNG-CONTRACTORS"]))).toBeNull();
  });

  it("returns null for an empty group list rather than a zero-permission session", () => {
    expect(resolveSession(payloadFor([]))).toBeNull();
  });

  it("never admits a session whose permission list would be empty", () => {
    const session = resolveSession(payloadFor(["OLNG-ELOG-OPERATORS"]));

    expect(session?.permissions.length).toBeGreaterThan(0);
  });

  /**
   * A mock token is unsigned, so a forged one can carry anything. Inherited
   * Object keys are truthy on a plain record lookup, which would otherwise slip
   * a bogus "role" past the resolver and crash the permission union.
   */
  it("denies inherited Object keys posing as AD groups instead of crashing", () => {
    expect(resolveSession(payloadFor(["constructor"]))).toBeNull();
    expect(resolveSession(payloadFor(["__proto__"]))).toBeNull();
    expect(resolveSession(payloadFor(["toString"]))).toBeNull();
    expect(resolveSession(payloadFor(["hasOwnProperty"]))).toBeNull();
  });

  it("ignores a prototype key sitting alongside a genuine group", () => {
    const session = resolveSession(
      payloadFor(["constructor", "OLNG-ELOG-OPERATORS"])
    );

    expect(session?.roles).toEqual(["operator"]);
    expect(session?.permissions).toEqual([
      "shift:read",
      "summary:read",
      "assistant:query",
      "action:read",
      "action:write",
    ]);
  });

  it("does not accept a role name where an AD group belongs", () => {
    expect(resolveSession(payloadFor(["administrator"]))).toBeNull();
  });
});

describe("unknownGroups / unknownGroupsMessage — the §4 422", () => {
  it("accepts all five §6 groups", () => {
    expect(unknownGroups(AD_GROUP_VALUES)).toEqual([]);
  });

  it("names only the groups that are unknown", () => {
    expect(
      unknownGroups(["OLNG-ELOG-OPERATORS", "SOME-GROUP", "OTHER-GROUP"])
    ).toEqual(["SOME-GROUP", "OTHER-GROUP"]);
  });

  it("treats inherited Object keys as unknown, not as valid groups", () => {
    expect(unknownGroups(["constructor", "__proto__", "toString"])).toEqual([
      "constructor",
      "__proto__",
      "toString",
    ]);
  });

  it("builds §4's message shape, listing every valid group", () => {
    const message = unknownGroupsMessage(["SOME-GROUP"]);

    expect(message).toBe(
      "Unknown AD group(s): SOME-GROUP. Valid groups: OLNG-ELOG-ADMINS, OLNG-ELOG-OPERATORS, OLNG-ELOG-SUPERINTENDENTS, OLNG-ELOG-SUPERUSERS, OLNG-ELOG-SUPERVISORS"
    );
  });

  it("lists every one of the five valid groups regardless of ordering", () => {
    const message = unknownGroupsMessage(["SOME-GROUP"]);

    for (const group of AD_GROUP_VALUES) {
      expect(message).toContain(group);
    }
  });

  it("joins multiple unknown groups into the one message", () => {
    expect(unknownGroupsMessage(["A-GROUP", "B-GROUP"])).toContain(
      "Unknown AD group(s): A-GROUP, B-GROUP."
    );
  });
});

describe("authenticate — the §3 401 surface", () => {
  it("admits a valid bearer token", () => {
    const result = authenticate(bearerFor(["OLNG-ELOG-OPERATORS"]));

    expect(result.authenticated).toBe(true);
    expect(result.authenticated && result.session.username).toBe(
      "said.albusaidi"
    );
  });

  it("rejects a missing Authorization header", () => {
    const result = authenticate(null);

    expect(result.authenticated).toBe(false);
    expect(result.authenticated === false && result.message).toBe(
      MISSING_BEARER_MESSAGE
    );
  });

  it("rejects a header that is not a bearer scheme", () => {
    expect(authenticate("Basic abc123").authenticated).toBe(false);
    expect(authenticate("").authenticated).toBe(false);
    expect(authenticate("Bearer").authenticated).toBe(false);
  });

  it("rejects a bearer header with no token after the scheme", () => {
    const result = authenticate("Bearer   ");

    expect(result.authenticated).toBe(false);
    expect(result.authenticated === false && result.message).toBe(
      INVALID_TOKEN_MESSAGE
    );
  });

  it("rejects a token that cannot be decoded", () => {
    const result = authenticate("Bearer not-a-real-token");

    expect(result.authenticated).toBe(false);
    expect(result.authenticated === false && result.message).toBe(
      INVALID_TOKEN_MESSAGE
    );
  });

  it("rejects an expired token", () => {
    const past = Math.floor(Date.now() / 1000) - 10_000;
    const result = authenticate(
      bearerFor(["OLNG-ELOG-OPERATORS"], {
        iat: past,
        exp: past + MOCK_TOKEN_TTL_SECONDS,
      })
    );

    expect(result.authenticated).toBe(false);
    expect(result.authenticated === false && result.message).toBe(
      EXPIRED_TOKEN_MESSAGE
    );
  });

  it("denies an unmapped account with §5's message verbatim", () => {
    const result = authenticate(bearerFor(["OLNG-CONTRACTORS"]));

    expect(result.authenticated).toBe(false);
    expect(result.authenticated === false && result.message).toBe(
      "Access denied: your AD account is not mapped to any platform role. Contact an administrator to request access."
    );
    expect(UNMAPPED_ACCOUNT_MESSAGE).toBe(
      "Access denied: your AD account is not mapped to any platform role. Contact an administrator to request access."
    );
  });

  it("authenticates a token minted through the same path the route uses", () => {
    const minted = mintMockToken({
      username: "noura.alkindi",
      displayName: "Noura Al-Kindi",
      groups: ["OLNG-ELOG-ADMINS"],
    });
    const result = authenticate(`Bearer ${minted.access_token}`);

    expect(result.authenticated && result.session.permissions).toEqual(["*"]);
  });
});

describe("forbiddenMessage", () => {
  it("names the permission the caller was missing", () => {
    expect(forbiddenMessage("shift:read")).toContain("shift:read");
  });
});
