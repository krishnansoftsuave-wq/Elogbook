"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { API_ENDPOINTS } from "@/constants/api";
import { trendsKeys } from "@/features/trends/api/keys";
import {
  trendsSummaryResponseSchema,
  toTrendsSummary,
  type TrendPeriod,
} from "@/features/trends/schemas";
import { api } from "@/lib/api-client";
import { retryUnlessClientError } from "@/lib/query-retry";

/**
 * `GET /trends` for one window. Errors — including a 403 — are left to the
 * caller: the global `QueryCache.onError` toast still fires, and the page
 * additionally renders `PermissionDenied` in place for a 403. Branching on the
 * status belongs to that caller, not this hook.
 */
export const useTrends = (period: TrendPeriod) =>
  useQuery({
    queryKey: trendsKeys.summary(period),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.TRENDS.SUMMARY, {
        params: { period },
      });
      return toTrendsSummary(
        trendsSummaryResponseSchema.parse(response.data).data
      );
    },
    // Keeps the previous window on screen while the next one loads.
    placeholderData: keepPreviousData,
    retry: retryUnlessClientError,
  });
