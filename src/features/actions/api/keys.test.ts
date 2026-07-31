import { describe, expect, it } from "vitest";

import { DEFAULT_PAGE_SIZE } from "@/constants/api";
import { actionKeys } from "@/features/actions/api/keys";
import type { ActionFilters } from "@/features/actions/types";

const FILTERS: ActionFilters = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  search: "",
  status: "all",
  priority: "all",
  area: "all",
  overdueOnly: false,
};

describe("actionKeys", () => {
  it("nests every key under `all`, so one invalidation reaches them", () => {
    const root = actionKeys.all[0];

    expect(actionKeys.lists()[0]).toBe(root);
    expect(actionKeys.list(FILTERS)[0]).toBe(root);
    expect(actionKeys.details()[0]).toBe(root);
    expect(actionKeys.detail("ACT-2041")[0]).toBe(root);
    expect(actionKeys.comments("ACT-2041")[0]).toBe(root);
  });

  /** Changing a filter must change the key, or the cache serves stale rows. */
  it("distinguishes lists by their filters", () => {
    const open = actionKeys.list({ ...FILTERS, status: "open" });
    const held = actionKeys.list({ ...FILTERS, status: "on_hold" });

    expect(open).not.toEqual(held);
    expect(actionKeys.list(FILTERS)).toEqual(actionKeys.list({ ...FILTERS }));
  });

  it("distinguishes pages", () => {
    expect(actionKeys.list({ ...FILTERS, page: 1 })).not.toEqual(
      actionKeys.list({ ...FILTERS, page: 2 })
    );
  });

  it("scopes a comment thread under its own action", () => {
    expect(actionKeys.comments("ACT-2041")).not.toEqual(
      actionKeys.comments("ACT-2038")
    );
    // Prefix of the detail key, so invalidating one action reaches its thread.
    expect(actionKeys.comments("ACT-2041").slice(0, 3)).toEqual(
      actionKeys.detail("ACT-2041")
    );
  });
});
