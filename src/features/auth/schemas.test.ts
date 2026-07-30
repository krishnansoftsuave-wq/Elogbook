import { describe, expect, it } from "vitest";

import {
  devTokenRequestSchema,
  devTokenResponseSchema,
  meDataSchema,
  meResponseSchema,
  toSessionUser,
} from "@/features/auth/schemas";
import { apiErrorSchema } from "@/lib/zod";

const meta = {
  correlation_id: "fca71eb84a9c4233a5fe43f5ce6421e9",
  timestamp: "2026-07-30T09:58:47.185814+00:00",
};

/** The §5 example response, field for field. */
const meData = {
  subject: "dev|jane.operator",
  username: "jane.operator",
  display_name: "Jane Operator",
  roles: ["operator"],
  groups: ["OLNG-ELOG-OPERATORS"],
  permissions: [
    "shift:read",
    "summary:read",
    "assistant:query",
    "action:read",
    "action:write",
  ],
  area_scope: null,
};

describe("meResponseSchema", () => {
  it("accepts the §5 success envelope verbatim", () => {
    const result = meResponseSchema.safeParse({
      success: true,
      data: meData,
      meta,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a bare body that skipped the envelope", () => {
    expect(meResponseSchema.safeParse(meData).success).toBe(false);
  });

  it("rejects an error envelope reaching the success path", () => {
    const result = meResponseSchema.safeParse({
      success: false,
      error: { code: "unauthorized", message: "Access denied", details: null },
      meta,
    });
    expect(result.success).toBe(false);
  });

  it("requires the correlation id and timestamp the contract promises", () => {
    const result = meResponseSchema.safeParse({
      success: true,
      data: meData,
      meta: { correlation_id: "abc" },
    });
    expect(result.success).toBe(false);
  });
});

describe("meDataSchema", () => {
  it("reads area_scope: null as full-plant access", () => {
    const result = meDataSchema.safeParse(meData);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.area_scope).toBeNull();
  });

  it("reads an area_scope list as a restriction", () => {
    const result = meDataSchema.safeParse({
      ...meData,
      area_scope: ["Train 1", "Train 2"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.area_scope).toEqual(["Train 1", "Train 2"]);
    }
  });

  it("accepts a role this build has never heard of", () => {
    // §6 lets an Administrator create custom roles through the admin API, and
    // BRD §4 requires those to work without a frontend redeploy. Rejecting the
    // parse here would 401-by-Zod a legitimately provisioned user and lock them
    // out of the app entirely. Authorization is carried by `permissions` (§5),
    // never by role name, so accepting an unknown role weakens no gate.
    const result = meDataSchema.safeParse({
      ...meData,
      roles: ["shutdown_coordinator"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts every one of the five contract roles", () => {
    const result = meDataSchema.safeParse({
      ...meData,
      roles: [
        "operator",
        "supervisor",
        "management",
        "administrator",
        "super_user",
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a permission string this build has never heard of", () => {
    // §6 lets an Administrator create custom roles carrying new permissions;
    // rejecting one would lock out a legitimately provisioned user.
    const result = meDataSchema.safeParse({
      ...meData,
      permissions: ["shutdown:approve"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts the administrator wildcard as a permission value", () => {
    const result = meDataSchema.safeParse({ ...meData, permissions: ["*"] });
    expect(result.success).toBe(true);
  });
});

describe("toSessionUser", () => {
  it("renames every snake_case wire field to the camelCase the app reads", () => {
    const parsed = meDataSchema.parse({
      ...meData,
      area_scope: ["Train 1"],
    });

    expect(toSessionUser(parsed)).toEqual({
      subject: "dev|jane.operator",
      username: "jane.operator",
      displayName: "Jane Operator",
      roles: ["operator"],
      groups: ["OLNG-ELOG-OPERATORS"],
      permissions: meData.permissions,
      areaScope: ["Train 1"],
    });
  });

  it("carries a null area scope through unchanged", () => {
    expect(toSessionUser(meDataSchema.parse(meData)).areaScope).toBeNull();
  });
});

describe("devTokenRequestSchema", () => {
  it("accepts the §4 example request", () => {
    const result = devTokenRequestSchema.safeParse({
      username: "jane.operator",
      groups: ["OLNG-ELOG-OPERATORS"],
      display_name: "Jane Operator",
    });
    expect(result.success).toBe(true);
  });

  it("treats display_name as optional, as §4 says", () => {
    const result = devTokenRequestSchema.safeParse({
      username: "jane.operator",
      groups: ["OLNG-ELOG-OPERATORS"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty username", () => {
    const result = devTokenRequestSchema.safeParse({
      username: "   ",
      groups: ["OLNG-ELOG-OPERATORS"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty groups list, which §4 requires to have at least one", () => {
    const result = devTokenRequestSchema.safeParse({
      username: "jane.operator",
      groups: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("devTokenResponseSchema", () => {
  it("accepts the §4 success envelope", () => {
    const result = devTokenResponseSchema.safeParse({
      success: true,
      data: {
        access_token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.stub.signature",
        token_type: "Bearer",
        expires_in: 900,
      },
      meta,
    });
    expect(result.success).toBe(true);
  });

  it("rejects expires_in sent as a string rather than seconds", () => {
    const result = devTokenResponseSchema.safeParse({
      success: true,
      data: {
        access_token: "token",
        token_type: "Bearer",
        expires_in: "900",
      },
      meta,
    });
    expect(result.success).toBe(false);
  });
});

describe("apiErrorSchema", () => {
  it("accepts the §5 unmapped-account deny envelope", () => {
    const result = apiErrorSchema.safeParse({
      success: false,
      error: {
        code: "unauthorized",
        message:
          "Access denied: your AD account is not mapped to any platform role. Contact an administrator to request access.",
        details: null,
      },
      meta,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.error.code).toBe("unauthorized");
  });

  it("accepts a details payload the contract never pins down", () => {
    const result = apiErrorSchema.safeParse({
      success: false,
      error: {
        code: "validation_error",
        message: "Unknown AD group(s): SOME-GROUP.",
        details: { groups: "Unknown AD group" },
      },
      meta,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a success envelope reaching the error path", () => {
    const result = apiErrorSchema.safeParse({
      success: true,
      data: meData,
      meta,
    });
    expect(result.success).toBe(false);
  });
});
