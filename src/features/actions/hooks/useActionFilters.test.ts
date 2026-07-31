import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_PAGE_SIZE } from "@/constants/api";
import { useActionFilters } from "@/features/actions/hooks/useActionFilters";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useActionFilters", () => {
  it("starts unfiltered on page 1", () => {
    const { result } = renderHook(() => useActionFilters());

    expect(result.current.filters).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      search: "",
      status: "all",
      priority: "all",
      area: "all",
      overdueOnly: false,
    });
    expect(result.current.isFiltered).toBe(false);
  });

  /**
   * Narrowing a filter while on page 4 would otherwise land on an empty page
   * that reads as "no results" — the bug this rule exists to prevent.
   */
  it("resets to page 1 on any change except paging", () => {
    const { result } = renderHook(() => useActionFilters());

    act(() => result.current.setFilter("page", 4));
    expect(result.current.filters.page).toBe(4);

    act(() => result.current.setFilter("status", "open"));
    expect(result.current.filters.page).toBe(1);
  });

  it("keeps the page when paging", () => {
    const { result } = renderHook(() => useActionFilters());

    act(() => result.current.setFilter("page", 3));
    expect(result.current.filters.page).toBe(3);
  });

  /** Typing must not fire a request per keystroke. */
  it("debounces search into the query filters", () => {
    const { result } = renderHook(() => useActionFilters());

    act(() => result.current.setFilter("search", "XV-118"));

    // Visible immediately in the input…
    expect(result.current.filters.search).toBe("XV-118");
    // …but not yet in what feeds the query key.
    expect(result.current.queryFilters.search).toBe("");

    act(() => vi.advanceTimersByTime(300));
    expect(result.current.queryFilters.search).toBe("XV-118");
  });

  it("passes non-search filters through immediately", () => {
    const { result } = renderHook(() => useActionFilters());

    act(() => result.current.setFilter("priority", "critical"));
    expect(result.current.queryFilters.priority).toBe("critical");
  });

  it.each([
    ["search", "XV-118"],
    ["status", "open"],
    ["priority", "high"],
    ["area", "B-train"],
    ["overdueOnly", true],
  ] as const)("reports isFiltered after setting %s", (key, value) => {
    const { result } = renderHook(() => useActionFilters());

    act(() => result.current.setFilter(key, value));
    expect(result.current.isFiltered).toBe(true);
  });

  it("does not report isFiltered for paging alone", () => {
    const { result } = renderHook(() => useActionFilters());

    act(() => result.current.setFilter("page", 2));
    act(() => result.current.setFilter("pageSize", 50));
    expect(result.current.isFiltered).toBe(false);
  });

  it("reset returns every filter to its initial value", () => {
    const { result } = renderHook(() => useActionFilters());

    act(() => result.current.setFilter("status", "on_hold"));
    act(() => result.current.setFilter("overdueOnly", true));
    act(() => result.current.reset());

    expect(result.current.isFiltered).toBe(false);
    expect(result.current.filters.status).toBe("all");
    expect(result.current.filters.overdueOnly).toBe(false);
  });
});
