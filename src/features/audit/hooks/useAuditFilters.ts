"use client";

import { useCallback, useMemo, useState } from "react";

import { DEFAULT_PAGE_SIZE } from "@/constants/api";
import type { AuditFilters } from "@/features/audit/types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

/**
 * List filters are local UI state — `useState`, then the query key, never
 * Zustand. Same shape as `useSummaryFilters` and `useUserFilters`.
 *
 * `from` / `to` are plant-local calendar dates, empty meaning unbounded.
 */
const INITIAL_FILTERS: AuditFilters = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  search: "",
  username: "all",
  action: "all",
  from: "",
  to: "",
};

export const useAuditFilters = () => {
  const [filters, setFilters] = useState<AuditFilters>(INITIAL_FILTERS);
  const debouncedSearch = useDebouncedValue(filters.search);

  /**
   * Any change other than paging resets to page 1 — otherwise narrowing a
   * filter while on page 4 lands on an empty page that looks like "no results".
   */
  const setFilter = useCallback(
    <TKey extends keyof AuditFilters>(key: TKey, value: AuditFilters[TKey]) => {
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
  // per keystroke. The dates and selects are not debounced: they commit a whole
  // value at once rather than a character at a time.
  const queryFilters = useMemo<AuditFilters>(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch]
  );

  const isFiltered =
    filters.search !== "" ||
    filters.username !== "all" ||
    filters.action !== "all" ||
    filters.from !== "" ||
    filters.to !== "";

  return { filters, queryFilters, setFilter, reset, isFiltered };
};
