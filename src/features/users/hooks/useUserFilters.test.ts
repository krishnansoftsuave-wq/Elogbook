import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useUserFilters } from "@/features/users/hooks/useUserFilters";

describe("useUserFilters", () => {
  it("starts unfiltered on page one", () => {
    const { result } = renderHook(() => useUserFilters());
    expect(result.current.filters.page).toBe(1);
    expect(result.current.isFiltered).toBe(false);
  });

  it("returns to page one when a filter changes", () => {
    const { result } = renderHook(() => useUserFilters());

    act(() => result.current.setFilter("page", 4));
    expect(result.current.filters.page).toBe(4);

    act(() => result.current.setFilter("status", "suspended"));
    expect(result.current.filters.page).toBe(1);
    expect(result.current.isFiltered).toBe(true);
  });

  it("keeps the page when only paging", () => {
    const { result } = renderHook(() => useUserFilters());
    act(() => result.current.setFilter("page", 3));
    expect(result.current.filters.page).toBe(3);
  });

  it("clears every filter on reset", () => {
    const { result } = renderHook(() => useUserFilters());
    act(() => result.current.setFilter("search", "ada"));
    act(() => result.current.reset());
    expect(result.current.filters.search).toBe("");
    expect(result.current.isFiltered).toBe(false);
  });
});
