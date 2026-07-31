import { describe, expect, it } from "vitest";

import { toUser, userStatusSchema, userWireSchema } from "@/types/user";

/**
 * The directory record — **a mirror of Active Directory**, not something this
 * platform owns. `types/user.ts` records why the shape changed; these pin the
 * three decisions that would be easiest to reverse by accident.
 */

const WIRE = {
  username: "maryam.alzadjali",
  display_name: "Maryam Al-Zadjali",
  ad_groups: ["OLNG-ELOG-OPERATORS", "OLNG-ELOG-SUPERINTENDENTS"],
  roles: ["operator", "management"],
  status: "active",
  last_seen_at: null,
} as const;

describe("userWireSchema", () => {
  it("accepts the shape the handler serves", () => {
    expect(() => userWireSchema.parse(WIRE)).not.toThrow();
  });

  /**
   * **FR-AUTH-03** — a person holding several AD groups gets "both roles'
   * permissions combined", so the directory must be able to say they hold two.
   */
  it("carries several roles for one person", () => {
    expect(userWireSchema.parse(WIRE).roles).toEqual([
      "operator",
      "management",
    ]);
  });

  /**
   * `authentication_flow.md` §6 lets an Administrator create a custom role this
   * build has never heard of. Validating `roles` against the closed enum would
   * make the whole directory page fail to parse because of one person — so the
   * field is an open `string[]` on purpose, and this is the assertion that stops
   * somebody "tightening" it.
   */
  it("accepts a role name this build does not know", () => {
    const parsed = userWireSchema.parse({
      ...WIRE,
      roles: ["shutdown_coordinator"],
    });

    expect(parsed.roles).toEqual(["shutdown_coordinator"]);
  });

  it("accepts someone whose AD groups map to nothing", () => {
    const parsed = userWireSchema.parse({
      ...WIRE,
      ad_groups: ["OLNG-CONTRACTORS"],
      roles: [],
    });

    expect(parsed.roles).toEqual([]);
  });

  it("accepts a last-seen timestamp as well as null", () => {
    const parsed = userWireSchema.parse({
      ...WIRE,
      last_seen_at: "2026-07-31T05:12:00+00:00",
    });

    expect(parsed.last_seen_at).toBe("2026-07-31T05:12:00+00:00");
  });

  it("rejects a record missing the AD fields", () => {
    expect(() =>
      userWireSchema.parse({ username: "x", status: "active" })
    ).toThrow();
  });
});

describe("userStatusSchema", () => {
  /**
   * Two values, not three. `invited` went with the create flow: accounts
   * originate in AD (**FR-AUTH-02**), so nothing here ever issues an invitation.
   */
  it("has exactly active and suspended", () => {
    expect(userStatusSchema.options).toEqual(["active", "suspended"]);
    expect(userStatusSchema.safeParse("invited").success).toBe(false);
  });
});

describe("toUser", () => {
  it("camel-cases every wire field", () => {
    expect(toUser(userWireSchema.parse(WIRE))).toEqual({
      username: "maryam.alzadjali",
      displayName: "Maryam Al-Zadjali",
      adGroups: ["OLNG-ELOG-OPERATORS", "OLNG-ELOG-SUPERINTENDENTS"],
      roles: ["operator", "management"],
      status: "active",
      lastSeenAt: null,
    });
  });
});
