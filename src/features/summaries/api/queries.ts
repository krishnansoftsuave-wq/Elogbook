"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { API_ENDPOINTS } from "@/constants/api";
import { summaryKeys } from "@/features/summaries/api/keys";
import {
  summaryDetailResponseSchema,
  summaryListResponseSchema,
  toSummary,
  toSummaryListItem,
} from "@/features/summaries/schemas";
import type { SummaryFilters } from "@/features/summaries/types";
import { api } from "@/lib/api-client";
import { DASHBOARD_REFRESH } from "@/lib/query-refresh";
import { retryUnlessClientError } from "@/lib/query-retry";

/**
 * Filters become request params verbatim, minus the empty ones — the shape
 * `features/actions/api/queries.ts` established.
 *
 * `from` / `to` are FR-HOME-04's date bounds and are omitted when blank rather
 * than sent empty, so an unbounded list and a cleared filter produce the same
 * request.
 */
const toParams = (filters: SummaryFilters) => ({
  page: filters.page,
  pageSize: filters.pageSize,
  ...(filters.search ? { search: filters.search } : {}),
  ...(filters.from ? { from: filters.from } : {}),
  ...(filters.to ? { to: filters.to } : {}),
});

export const useSummariesList = (filters: SummaryFilters) =>
  useQuery({
    queryKey: summaryKeys.list(filters),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.SUMMARIES.LIST, {
        params: toParams(filters),
      });
      const page = summaryListResponseSchema.parse(response.data).data;

      return { ...page, items: page.items.map(toSummaryListItem) };
    },
    // Keeps the previous page on screen while the next one loads, so paging
    // does not flash an empty table.
    placeholderData: keepPreviousData,
  });

/**
 * One summary, with its sections, comments and AI confirmations.
 *
 * The list endpoint strips those three fields, so this is the only way to read a
 * summary's body — and the only way to read its comment thread, since
 * `/summaries/:id/comments` is write-only.
 */
export const useSummary = (id: string) =>
  useQuery({
    queryKey: summaryKeys.detail(id),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.SUMMARIES.DETAIL(id));
      return toSummary(summaryDetailResponseSchema.parse(response.data).data);
    },
    enabled: Boolean(id),
    retry: retryUnlessClientError,
  });

/**
 * The newest summary, whole — what the dashboard's previous-shift, critical-alarm
 * and safety-observation widgets read (FR-HOME-01, §6.1).
 *
 * **Two requests in one query, deliberately.** The list is ordered newest-first
 * but omits `sections`, and there is no `/summaries/latest` route; so this asks
 * for one list row to learn the id, then reads that id's detail. Doing it inside
 * a single `queryFn` rather than chaining two hooks keeps it one cache entry with
 * one loading flag — three dashboard widgets read this, and three independent
 * `enabled`-gated hooks would flicker independently.
 *
 * Returns `null` for a plant with no summaries yet rather than throwing, because
 * "nothing has been generated" is an empty state on the dashboard, not an error.
 *
 * **"Newest" is the server's ordering, not an assumption.** `GET /summaries`
 * sorts by `generated_at` descending, which is what makes `items[0]` of a
 * one-row page the right record. It did not always: the handler applied no sort
 * at all and this hook relied on the seed array's incidental order, so
 * generating a summary for an older shift — `POST /summaries` prepends an
 * unseen id — silently repointed every dashboard widget at a months-old shift.
 * The ordering is now the endpoint's documented contract and
 * `routes.test.ts` pins it.
 */
export const useLatestSummary = () =>
  useQuery({
    queryKey: summaryKeys.latest(),
    queryFn: async () => {
      const listResponse = await api.get(API_ENDPOINTS.SUMMARIES.LIST, {
        params: { page: 1, pageSize: 1 },
      });
      const page = summaryListResponseSchema.parse(listResponse.data).data;
      const newest = page.items[0];
      if (!newest) return null;

      const detailResponse = await api.get(
        API_ENDPOINTS.SUMMARIES.DETAIL(newest.id)
      );
      return toSummary(
        summaryDetailResponseSchema.parse(detailResponse.data).data
      );
    },
    ...DASHBOARD_REFRESH,
  });
