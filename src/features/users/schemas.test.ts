import { describe, expect, it } from "vitest";

import { userFormSchema, userListSchema } from "@/features/users/schemas";

const validUser = {
  id: "u1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  role: "administrator",
  status: "active",
  createdAt: "2026-01-15T09:30:00.000Z",
};

describe("userListSchema", () => {
  it("accepts a well-formed page of results", () => {
    const result = userListSchema.safeParse({
      items: [validUser],
      total: 1,
      page: 1,
      pageSize: 10,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown role rather than letting it reach the UI", () => {
    const result = userListSchema.safeParse({
      items: [{ ...validUser, role: "superadmin" }],
      total: 1,
      page: 1,
      pageSize: 10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a response missing the pagination envelope", () => {
    expect(userListSchema.safeParse({ items: [validUser] }).success).toBe(
      false
    );
  });
});

describe("userFormSchema", () => {
  it("trims the name before validating length", () => {
    const result = userFormSchema.safeParse({
      name: "  Ada  ",
      email: "ada@example.com",
      role: "operator",
      status: "invited",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Ada");
  });

  it("reports a readable message for a bad email", () => {
    const result = userFormSchema.safeParse({
      name: "Ada",
      email: "not-an-email",
      role: "operator",
      status: "invited",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Enter a valid email address"
      );
    }
  });
});
