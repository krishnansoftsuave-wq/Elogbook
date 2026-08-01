import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { USER_FILTERS_DEFAULTS } from "@/features/users/hooks/userFilterParams";
import { useUserFilters } from "@/features/users/hooks/useUserFilters";

/*
  `useUserFilters` mirrors filter state into the URL via `router.replace`,
  same as `useAuditFilters`. `vi.hoisted` gives the mock factory below a
  `replace` it can close over that is also the one test bodies import — the
  factory itself runs on every `useRouter()` call, so a fresh `vi.fn()` there
  would be a different spy per render and nothing a test could assert calls
  against.
*/
const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/users",
  useRouter: () => ({ replace }),
}));

describe("useUserFilters", () => {
  it("starts unfiltered on page one", () => {
    const { result } = renderHook(() => useUserFilters(USER_FILTERS_DEFAULTS));
    expect(result.current.filters.page).toBe(1);
    expect(result.current.isFiltered).toBe(false);
  });

  it("returns to page one when a filter changes", () => {
    const { result } = renderHook(() => useUserFilters(USER_FILTERS_DEFAULTS));

    act(() => result.current.setFilter("page", 4));
    expect(result.current.filters.page).toBe(4);

    act(() => result.current.setFilter("status", "suspended"));
    expect(result.current.filters.page).toBe(1);
    expect(result.current.isFiltered).toBe(true);
  });

  it("keeps the page when only paging", () => {
    const { result } = renderHook(() => useUserFilters(USER_FILTERS_DEFAULTS));
    act(() => result.current.setFilter("page", 3));
    expect(result.current.filters.page).toBe(3);
  });

  it("clears every filter on reset", () => {
    const { result } = renderHook(() => useUserFilters(USER_FILTERS_DEFAULTS));
    act(() => result.current.setFilter("search", "ada"));
    act(() => result.current.reset());
    expect(result.current.filters.search).toBe("");
    expect(result.current.isFiltered).toBe(false);
  });

  it("mirrors filters into the URL via router.replace", () => {
    replace.mockClear();
    const { result } = renderHook(() => useUserFilters(USER_FILTERS_DEFAULTS));

    act(() => result.current.setFilter("status", "suspended"));

    expect(replace).toHaveBeenCalledWith(
      "/admin/users?status=suspended",
      expect.objectContaining({ scroll: false })
    );
  });

  it("seeds filters from an initial value instead of the defaults", () => {
    const { result } = renderHook(() =>
      useUserFilters({ ...USER_FILTERS_DEFAULTS, role: "operator" })
    );

    expect(result.current.filters.role).toBe("operator");
    expect(result.current.isFiltered).toBe(true);
  });
});
