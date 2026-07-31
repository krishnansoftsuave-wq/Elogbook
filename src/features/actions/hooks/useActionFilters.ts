"use client";

import { useCallback, useMemo, useState } from "react";

import { DEFAULT_PAGE_SIZE } from "@/constants/api";
import type { ActionFilters } from "@/features/actions/types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

/**
 * List filters are local UI state — `useState`, then the query key, never
 * Zustand. Same shape as `features/users/hooks/useUserFilters.ts`, which is the
 * reference implementation for this.
 */
const INITIAL_FILTERS: ActionFilters = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  search: "",
  status: "all",
  priority: "all",
  area: "all",
  overdueOnly: false,
};

export const useActionFilters = () => {
  const [filters, setFilters] = useState<ActionFilters>(INITIAL_FILTERS);
  const debouncedSearch = useDebouncedValue(filters.search);

  /**
   * Any change other than paging resets to page 1 — otherwise narrowing a
   * filter while on page 4 lands on an empty page that looks like "no results".
   */
  const setFilter = useCallback(
    <TKey extends keyof ActionFilters>(
      key: TKey,
      value: ActionFilters[TKey]
    ) => {
      setFilters((current) => ({
        ...current,
        [key]: value,
        ...(key === "page" ? {} : { page: 1 }),
      }));
    },
    []
  );

  const reset = useCallback(() => setFilters(INITIAL_FILTERS), []);

  // The debounced copy feeds the query key, so typing does not fire a request
  // per keystroke.
  const queryFilters = useMemo<ActionFilters>(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch]
  );

  const isFiltered =
    filters.search !== "" ||
    filters.status !== "all" ||
    filters.priority !== "all" ||
    filters.area !== "all" ||
    filters.overdueOnly;

  return { filters, queryFilters, setFilter, reset, isFiltered };
};
