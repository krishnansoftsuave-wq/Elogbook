"use client";

import { useCallback, useMemo, useState } from "react";

import { DEFAULT_PAGE_SIZE } from "@/constants/api";
import type { UserFilters } from "@/features/users/types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const INITIAL_FILTERS: UserFilters = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  search: "",
  role: "all",
  status: "all",
};

/**
 * List filters are local UI state — they belong in `useState` and then in the
 * query key, never in Zustand — the state-ownership golden rule.
 */
export const useUserFilters = () => {
  const [filters, setFilters] = useState<UserFilters>(INITIAL_FILTERS);
  const debouncedSearch = useDebouncedValue(filters.search);

  /** Any change other than paging resets to page 1. */
  const setFilter = useCallback(
    <TKey extends keyof UserFilters>(key: TKey, value: UserFilters[TKey]) => {
      setFilters((current) => ({
        ...current,
        [key]: value,
        ...(key === "page" ? {} : { page: 1 }),
      }));
    },
    []
  );

  const reset = useCallback(() => setFilters(INITIAL_FILTERS), []);

  // The debounced copy is what feeds the query key, so typing does not fire a
  // request per keystroke.
  const queryFilters = useMemo<UserFilters>(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch]
  );

  const isFiltered =
    filters.search !== "" || filters.role !== "all" || filters.status !== "all";

  return { filters, queryFilters, setFilter, reset, isFiltered };
};
