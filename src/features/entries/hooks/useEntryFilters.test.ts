import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useEntryFilters } from "@/features/entries/hooks/useEntryFilters";

describe("useEntryFilters", () => {
  it("pins the scope it was created with", () => {
    const { result } = renderHook(() => useEntryFilters("pending"));
    expect(result.current.filters.scope).toBe("pending");
    expect(result.current.queryFilters.scope).toBe("pending");
  });

  it("returns to page one when a filter changes", () => {
    const { result } = renderHook(() => useEntryFilters("mine"));

    act(() => result.current.setFilter("page", 3));
    expect(result.current.filters.page).toBe(3);

    act(() => result.current.setFilter("status", "draft"));
    expect(result.current.filters.page).toBe(1);
    expect(result.current.isFiltered).toBe(true);
  });

  it("keeps the scope when filters are reset", () => {
    const { result } = renderHook(() => useEntryFilters("pending"));

    act(() => result.current.setFilter("search", "seal"));
    act(() => result.current.reset());

    expect(result.current.filters.search).toBe("");
    expect(result.current.filters.scope).toBe("pending");
    expect(result.current.isFiltered).toBe(false);
  });

  it("gives each scope an independent key so panels cache separately", () => {
    const mine = renderHook(() => useEntryFilters("mine"));
    const pending = renderHook(() => useEntryFilters("pending"));

    expect(mine.result.current.queryFilters).not.toEqual(
      pending.result.current.queryFilters
    );
  });
});
