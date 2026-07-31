import { describe, expect, it } from "vitest";

import { DEFAULT_PAGE_SIZE } from "@/constants/api";
import { summaryKeys } from "@/features/summaries/api/keys";
import type { SummaryFilters } from "@/features/summaries/types";

const FILTERS: SummaryFilters = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  search: "",
  from: "",
  to: "",
};

describe("summaryKeys", () => {
  it("nests every key under `all`, so one invalidation reaches them", () => {
    const root = summaryKeys.all[0];

    expect(summaryKeys.lists()[0]).toBe(root);
    expect(summaryKeys.list(FILTERS)[0]).toBe(root);
    expect(summaryKeys.details()[0]).toBe(root);
    expect(summaryKeys.detail("SUM-20260731-D")[0]).toBe(root);
    expect(summaryKeys.latest()[0]).toBe(root);
  });

  /** Changing a filter must change the key, or the cache serves stale rows. */
  it("distinguishes lists by their filters", () => {
    expect(summaryKeys.list({ ...FILTERS, search: "SUM-1" })).not.toEqual(
      summaryKeys.list(FILTERS)
    );
    expect(summaryKeys.list(FILTERS)).toEqual(summaryKeys.list({ ...FILTERS }));
  });

  /** FR-HOME-04's date bounds are part of the identity of a result set. */
  it("distinguishes lists by their date range", () => {
    expect(summaryKeys.list({ ...FILTERS, from: "2026-07-01" })).not.toEqual(
      summaryKeys.list(FILTERS)
    );
    expect(summaryKeys.list({ ...FILTERS, to: "2026-07-31" })).not.toEqual(
      summaryKeys.list({ ...FILTERS, from: "2026-07-01" })
    );
  });

  it("distinguishes pages", () => {
    expect(summaryKeys.list({ ...FILTERS, page: 1 })).not.toEqual(
      summaryKeys.list({ ...FILTERS, page: 2 })
    );
  });

  it("scopes a detail key to its own summary", () => {
    expect(summaryKeys.detail("SUM-20260731-D")).not.toEqual(
      summaryKeys.detail("SUM-20260730-N")
    );
  });

  /**
   * `latest` must not collide with a detail key, or invalidating one summary
   * would silently drop the dashboard's cache — and vice versa.
   */
  it("keeps `latest` distinct from any detail key", () => {
    expect(summaryKeys.latest()).not.toEqual(summaryKeys.detail("latest"));
    expect(summaryKeys.latest()).not.toEqual(summaryKeys.lists());
  });

  /**
   * There is deliberately no `comments(id)` member: `/summaries/:id/comments` is
   * write-only, so a comments key would name a resource nothing can fetch.
   * Posting invalidates `detail(id)` instead.
   */
  it("has no comments key, because comments are part of the detail record", () => {
    expect(summaryKeys).not.toHaveProperty("comments");
  });
});
