import { describe, expect, it } from "vitest";

import { DEFAULT_PAGE_SIZE } from "@/constants/api";
import { userKeys } from "@/features/users/api/keys";
import type { UserFilters } from "@/features/users/types";

const filters: UserFilters = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  search: "",
  role: "all",
  status: "all",
};

describe("userKeys", () => {
  it("nests every key under the feature root so one invalidate clears them all", () => {
    expect(userKeys.list(filters)[0]).toBe("users");
    expect(userKeys.detail("abc")[0]).toBe("users");
  });

  it("varies the list key by filters, so each filter set caches separately", () => {
    const other = userKeys.list({ ...filters, page: 2 });
    expect(userKeys.list(filters)).not.toEqual(other);
  });

  it("produces a stable key for identical filters", () => {
    expect(userKeys.list(filters)).toEqual(userKeys.list({ ...filters }));
  });
});
