"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  AUDIT_FILTERS_DEFAULTS,
  auditFiltersToSearchParams,
} from "@/features/audit/hooks/auditFilterParams";
import type { AuditFilters } from "@/features/audit/types";

/**
 * List filters are local UI state — `useState`, then the query key, same
 * shape as `useSummaryFilters` and `useUserFilters` — **plus** a mirror into
 * the URL, which those siblings don't have. That divergence is a deliberate,
 * Audit-only product decision: a filtered audit view is something a reviewer
 * shares or bookmarks, not just narrows and reads once. `AdminAuditPage`
 * reads the inbound URL server-side (`searchParams`, not `useSearchParams`)
 * to seed `initialFilters` — the same reason `auth/login/page.tsx` reads
 * `returnTo` that way — so this hook never calls `useSearchParams()` and
 * carries none of its Suspense-boundary requirement.
 *
 * `from` / `to` are plant-local calendar dates, empty meaning unbounded.
 */
export const useAuditFilters = (initialFilters: AuditFilters) => {
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState<AuditFilters>(initialFilters);

  // Replaced, not pushed — narrowing a filter should not fill the back
  // button with one history entry per click. `router.back()` should leave
  // the screen, not step back through chips one at a time.
  useEffect(() => {
    const query = auditFiltersToSearchParams(filters).toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [filters, pathname, router]);

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

  const reset = useCallback(() => setFilters(AUDIT_FILTERS_DEFAULTS), []);

  const isFiltered =
    filters.username !== "all" ||
    filters.action !== "all" ||
    filters.from !== "" ||
    filters.to !== "";

  return { filters, queryFilters: filters, setFilter, reset, isFiltered };
};
