import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_PAGE_SIZE } from "@/constants/api";
import { useSummaryFilters } from "@/features/summaries/hooks/useSummaryFilters";

describe("useSummaryFilters", () => {
  it("starts unfiltered on page 1", () => {
    const { result } = renderHook(() => useSummaryFilters());

    expect(result.current.filters).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      search: "",
      from: "",
      to: "",
    });
    expect(result.current.isFiltered).toBe(false);
  });

  /**
   * Narrowing while on page 4 would otherwise land on an empty page that reads
   * as "no results" — the bug this reset exists to prevent.
   */
  it("resets to page 1 when any filter other than the page changes", () => {
    const { result } = renderHook(() => useSummaryFilters());

    act(() => result.current.setFilter("page", 4));
    expect(result.current.filters.page).toBe(4);

    act(() => result.current.setFilter("search", "SUM-2"));
    expect(result.current.filters.page).toBe(1);

    act(() => result.current.setFilter("page", 3));
    act(() => result.current.setFilter("from", "2026-07-01"));
    expect(result.current.filters.page).toBe(1);
  });

  it("keeps the page when only the page changes", () => {
    const { result } = renderHook(() => useSummaryFilters());

    act(() => result.current.setFilter("page", 2));
    expect(result.current.filters.page).toBe(2);
  });

  it("reports being filtered by search or by either date bound", () => {
    const { result } = renderHook(() => useSummaryFilters());

    act(() => result.current.setFilter("search", "x"));
    expect(result.current.isFiltered).toBe(true);

    act(() => result.current.reset());
    expect(result.current.isFiltered).toBe(false);

    act(() => result.current.setFilter("from", "2026-07-01"));
    expect(result.current.isFiltered).toBe(true);

    act(() => result.current.reset());
    act(() => result.current.setFilter("to", "2026-07-31"));
    expect(result.current.isFiltered).toBe(true);
  });

  /** Changing the page size alone is paging, not filtering. */
  it("does not count a page-size change as a filter", () => {
    const { result } = renderHook(() => useSummaryFilters());

    act(() => result.current.setFilter("pageSize", 50));
    expect(result.current.isFiltered).toBe(false);
  });

  it("restores every field on reset", () => {
    const { result } = renderHook(() => useSummaryFilters());

    act(() => result.current.setFilter("search", "SUM-2"));
    act(() => result.current.setFilter("from", "2026-07-01"));
    act(() => result.current.setFilter("to", "2026-07-31"));
    act(() => result.current.setFilter("pageSize", 50));
    act(() => result.current.reset());

    expect(result.current.filters).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      search: "",
      from: "",
      to: "",
    });
  });

  /**
   * The debounced copy is what feeds the query key, so typing does not fire a
   * request per keystroke. The dates are **not** debounced — a date input
   * commits a whole value at once.
   */
  it("debounces search into the query filters but not the dates", async () => {
    const { result } = renderHook(() => useSummaryFilters());

    act(() => result.current.setFilter("search", "SUM-2"));
    expect(result.current.filters.search).toBe("SUM-2");
    expect(result.current.queryFilters.search).toBe("");

    act(() => result.current.setFilter("from", "2026-07-01"));
    expect(result.current.queryFilters.from).toBe("2026-07-01");

    await waitFor(() =>
      expect(result.current.queryFilters.search).toBe("SUM-2")
    );
  });
});
