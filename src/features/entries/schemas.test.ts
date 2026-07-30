import { describe, expect, it } from "vitest";

import { entryFormSchema, entryListSchema } from "@/features/entries/schemas";

const validEntry = {
  id: "e1",
  title: "Replaced hydraulic seal",
  body: "Drained the system, replaced the seal and pressure tested to 200 bar.",
  status: "submitted",
  authorId: "u1",
  authorName: "Ada Lovelace",
  signedBy: null,
  signedAt: null,
  performedAt: "2026-07-01T00:00:00.000Z",
  createdAt: "2026-07-01T10:15:00.000Z",
};

describe("entryListSchema", () => {
  it("accepts a well-formed page of results", () => {
    const result = entryListSchema.safeParse({
      items: [validEntry],
      total: 1,
      page: 1,
      pageSize: 10,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a signed entry carrying its signature metadata", () => {
    const result = entryListSchema.safeParse({
      items: [
        {
          ...validEntry,
          status: "signed",
          signedBy: "Grace Hopper",
          signedAt: "2026-07-02T08:00:00.000Z",
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown status rather than letting it reach the UI", () => {
    const result = entryListSchema.safeParse({
      items: [{ ...validEntry, status: "archived" }],
      total: 1,
      page: 1,
      pageSize: 10,
    });
    expect(result.success).toBe(false);
  });
});

describe("entryFormSchema", () => {
  const valid = {
    title: "Replaced hydraulic seal",
    body: "Drained the system and replaced the seal.",
    performedAt: "2026-07-01",
    status: "draft",
  };

  it("accepts a complete entry", () => {
    expect(entryFormSchema.safeParse(valid).success).toBe(true);
  });

  it("refuses to let the form set a status of signed", () => {
    const result = entryFormSchema.safeParse({ ...valid, status: "signed" });
    expect(result.success).toBe(false);
  });

  it("rejects a date that is not yyyy-mm-dd", () => {
    const result = entryFormSchema.safeParse({
      ...valid,
      performedAt: "01/07/2026",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Choose the date this took place"
      );
    }
  });

  it("rejects a body too short to be a useful record", () => {
    const result = entryFormSchema.safeParse({ ...valid, body: "did it" });
    expect(result.success).toBe(false);
  });
});
