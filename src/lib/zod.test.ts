import { describe, expect, it } from "vitest";
import { z } from "zod";

import { fieldErrorsFromZod } from "@/lib/zod";

const errorFrom = (schema: z.ZodType, value: unknown): z.ZodError => {
  const result = schema.safeParse(value);
  if (result.success) throw new Error("Expected the parse to fail.");
  return result.error;
};

/**
 * The one flattener behind both §4's 422 `details` map and a form's field
 * errors, so a client sees the same shape everywhere.
 */
describe("fieldErrorsFromZod", () => {
  it("maps each field to its first message", () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    const errors = fieldErrorsFromZod(errorFrom(schema, { name: 1, age: "x" }));

    expect(Object.keys(errors)).toEqual(["name", "age"]);
    expect(errors.name).toBeTruthy();
  });

  it("joins a nested path with dots", () => {
    const schema = z.object({ shift: z.object({ start: z.string() }) });
    const errors = fieldErrorsFromZod(errorFrom(schema, { shift: {} }));

    expect(errors).toHaveProperty("shift.start");
  });

  /**
   * A `z.strictObject` rejects an unknown key with a **root-level** issue: the
   * names live on `issue.keys` and `issue.path` is empty. Reading the path alone
   * dropped it, so `PATCH /users/:username` answered 422 with `details: {}` —
   * telling a client its request was invalid without saying which field. That
   * schema is strict precisely so somebody editing Active Directory's data is
   * told which field is not theirs to change.
   */
  it("names the offending key when a strict object rejects one", () => {
    const schema = z.strictObject({ status: z.string() });
    const errors = fieldErrorsFromZod(
      errorFrom(schema, { status: "active", roles: ["admin"] })
    );

    expect(errors).toHaveProperty("roles");
    expect(errors.roles).toBeTruthy();
  });

  it("names every offending key, not just the first", () => {
    const schema = z.strictObject({ status: z.string() });
    const errors = fieldErrorsFromZod(
      errorFrom(schema, { status: "active", roles: [], ad_groups: [] })
    );

    expect(Object.keys(errors).sort()).toEqual(["ad_groups", "roles"]);
  });

  it("keeps a field's own message when it also has an unknown sibling", () => {
    const schema = z.strictObject({ status: z.enum(["active"]) });
    const errors = fieldErrorsFromZod(
      errorFrom(schema, { status: "nope", roles: [] })
    );

    expect(Object.keys(errors).sort()).toEqual(["roles", "status"]);
  });
});
