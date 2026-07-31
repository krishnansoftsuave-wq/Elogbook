import { describe, expect, it } from "vitest";

import {
  userAccessUpdateSchema,
  userFiltersSchema,
} from "@/features/users/schemas";

/**
 * **What an Administrator may change about a person, and what is AD's.**
 *
 * `userAccessUpdateSchema` is a `z.strictObject` rather than a `z.object`, and
 * the difference is the whole point: a plain object would *strip* an
 * AD-owned field and answer 200, so a screen that tried to edit Active
 * Directory's data would believe it had succeeded.
 */
describe("userAccessUpdateSchema", () => {
  it("accepts a status change, which is the one field this platform owns", () => {
    expect(userAccessUpdateSchema.parse({ status: "suspended" })).toEqual({
      status: "suspended",
    });
  });

  /**
   * **FR-AUTH-02** governs group-to-role mapping "via the OLNG AD admin", and
   * §9.1 has the Administrator configure that *mapping* rather than assign roles
   * per user. A `roles` field here would let this screen contradict the
   * directory it mirrors.
   */
  it.each(["roles", "ad_groups", "display_name", "username"])(
    "refuses %s rather than silently dropping it",
    (field) => {
      const result = userAccessUpdateSchema.safeParse({
        status: "active",
        [field]: ["anything"],
      });

      expect(result.success).toBe(false);
      // Named, not merely refused — a client that tries should learn why.
      expect(JSON.stringify(result.error?.issues)).toContain(field);
    }
  );

  it("refuses a status outside the two the platform has", () => {
    expect(
      userAccessUpdateSchema.safeParse({ status: "invited" }).success
    ).toBe(false);
  });

  it("refuses an empty body — there is nothing to infer", () => {
    expect(userAccessUpdateSchema.safeParse({}).success).toBe(false);
  });
});

describe("userFiltersSchema", () => {
  const BASE = {
    page: 1,
    pageSize: 10,
    search: "",
    role: "all",
    status: "all",
  };

  it("accepts the initial filter state", () => {
    expect(() => userFiltersSchema.parse(BASE)).not.toThrow();
  });

  it("accepts a base role and the all sentinel for both selects", () => {
    expect(userFiltersSchema.parse({ ...BASE, role: "supervisor" }).role).toBe(
      "supervisor"
    );
    expect(
      userFiltersSchema.parse({ ...BASE, status: "suspended" }).status
    ).toBe("suspended");
  });

  it("rejects a page number that could not exist", () => {
    expect(userFiltersSchema.safeParse({ ...BASE, page: 0 }).success).toBe(
      false
    );
    expect(userFiltersSchema.safeParse({ ...BASE, page: 1.5 }).success).toBe(
      false
    );
  });

  /**
   * The filter select offers the five base roles; a custom role (§6) is not
   * offered because nothing enumerates them yet — Phase 3c. The schema being
   * closed here is deliberate and different from `userWireSchema.roles`, which
   * must stay open so an unknown role can still be *listed*.
   */
  it("rejects a role the select does not offer", () => {
    expect(
      userFiltersSchema.safeParse({ ...BASE, role: "shutdown_coordinator" })
        .success
    ).toBe(false);
  });
});
