"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  USER_FILTERS_DEFAULTS,
  userFiltersToSearchParams,
} from "@/features/users/hooks/userFilterParams";
import type { UserFilters } from "@/features/users/types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

/**
 * List filters are local UI state — `useState`, then the query key — **plus**
 * a mirror into the URL, same pattern as `useAuditFilters`: a filtered user
 * directory is something an Administrator shares or bookmarks, not just
 * narrows and reads once. `UsersPage` reads the inbound URL server-side
 * (`searchParams`, not `useSearchParams`) to seed `initialFilters`, so this
 * hook never calls `useSearchParams()` and carries none of its
 * Suspense-boundary requirement.
 */
export const useUserFilters = (initialFilters: UserFilters) => {
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState<UserFilters>(initialFilters);
  const debouncedSearch = useDebouncedValue(filters.search);

  // The debounced copy is what feeds the query key, so typing does not fire a
  // request per keystroke.
  const queryFilters = useMemo<UserFilters>(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch]
  );

  // Mirrors `queryFilters`, not raw `filters` — otherwise every keystroke in
  // the search box would push a history replacement ahead of the debounce
  // that already protects the network request. Replaced, not pushed —
  // narrowing a filter should not fill the back button with one history
  // entry per click. `router.back()` should leave the screen, not step back
  // through chips one at a time.
  useEffect(() => {
    const query = userFiltersToSearchParams(queryFilters).toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [queryFilters, pathname, router]);

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

  const reset = useCallback(() => setFilters(USER_FILTERS_DEFAULTS), []);

  const isFiltered =
    filters.search !== "" || filters.role !== "all" || filters.status !== "all";

  return { filters, queryFilters, setFilter, reset, isFiltered };
};
