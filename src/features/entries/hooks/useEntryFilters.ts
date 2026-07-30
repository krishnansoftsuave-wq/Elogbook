"use client";

import { useCallback, useMemo, useState } from "react";

import { DEFAULT_PAGE_SIZE } from "@/constants/api";
import type { EntryFilters, EntryScope } from "@/features/entries/types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const initialFilters = (scope: EntryScope): EntryFilters => ({
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  search: "",
  status: "all",
  scope,
});

/**
 * List filters are local UI state — they belong in `useState` and then in the
 * query key, never in Zustand (AGENTS.md, The Golden Rule).
 *
 * Each panel owns its own instance, so paging one does not disturb the other.
 */
export const useEntryFilters = (scope: EntryScope) => {
  const [filters, setFilters] = useState<EntryFilters>(() =>
    initialFilters(scope)
  );
  const debouncedSearch = useDebouncedValue(filters.search);

  /** Any change other than paging resets to page 1. */
  const setFilter = useCallback(
    <TKey extends keyof EntryFilters>(key: TKey, value: EntryFilters[TKey]) => {
      setFilters((current) => ({
        ...current,
        [key]: value,
        ...(key === "page" ? {} : { page: 1 }),
      }));
    },
    []
  );

  const reset = useCallback(() => setFilters(initialFilters(scope)), [scope]);

  // The debounced copy is what feeds the query key, so typing does not fire a
  // request per keystroke.
  const queryFilters = useMemo<EntryFilters>(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch]
  );

  const isFiltered = filters.search !== "" || filters.status !== "all";

  return { filters, queryFilters, setFilter, reset, isFiltered };
};
