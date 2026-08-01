import { describe, expect, it } from "vitest";

import { trendsKeys } from "@/features/trends/api/keys";

describe("trendsKeys", () => {
  it("nests every key under the feature root so one invalidate clears them all", () => {
    expect(trendsKeys.summary("7d")[0]).toBe("trends");
  });

  it("varies the summary key by period, so each window caches separately", () => {
    expect(trendsKeys.summary("7d")).not.toEqual(trendsKeys.summary("30d"));
  });

  it("produces a stable key for the same period", () => {
    expect(trendsKeys.summary("14d")).toEqual(trendsKeys.summary("14d"));
  });
});
