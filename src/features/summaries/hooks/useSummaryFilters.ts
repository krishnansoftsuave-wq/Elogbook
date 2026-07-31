"use client";

import { useCallback, useMemo, useState } from "react";

import { DEFAULT_PAGE_SIZE } from "@/constants/api";
import type { SummaryFilters } from "@/features/summaries/types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

/**
 * List filters are local UI state — `useState`, then the query key, never
 * Zustand. Same shape as `features/actions/hooks/useActionFilters.ts`.
 *
 * `from` / `to` are FR-HOME-04's date bounds, empty meaning unbounded.
 */
const INITIAL_FILTERS: SummaryFilters = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  search: "",
  from: "",
  to: "",
};

export const useSummaryFilters = () => {
  const [filters, setFilters] = useState<SummaryFilters>(INITIAL_FILTERS);
  const debouncedSearch = useDebouncedValue(filters.search);

  /**
   * Any change other than paging resets to page 1 — otherwise narrowing a
   * filter while on page 4 lands on an empty page that looks like "no results".
   */
  const setFilter = useCallback(
    <TKey extends keyof SummaryFilters>(
      key: TKey,
      value: SummaryFilters[TKey]
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
  // per keystroke. The dates are not debounced: a date input commits a whole
  // value at once rather than a character at a time.
  const queryFilters = useMemo<SummaryFilters>(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch]
  );

  const isFiltered =
    filters.search !== "" || filters.from !== "" || filters.to !== "";

  return { filters, queryFilters, setFilter, reset, isFiltered };
};
