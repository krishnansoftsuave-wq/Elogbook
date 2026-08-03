"use client";

import { useQuery } from "@tanstack/react-query";

import { API_ENDPOINTS } from "@/constants/api";
import { platformKeys } from "@/features/platform/api/keys";
import {
  platformOverviewResponseSchema,
  toPlatformOverview,
} from "@/features/platform/schemas";
import { api } from "@/lib/api-client";
import { DASHBOARD_REFRESH } from "@/lib/query-refresh";
import { retryUnlessClientError } from "@/lib/query-retry";

/**
 * All four Super User cards from one request — the same call that
 * `usePlantOperations` makes for its six, and for the same reasons.
 *
 * One query rather than four: they are drawn together on one screen, the whole
 * payload is under a kilobyte, and four keys would mean four round trips for
 * it. Splitting becomes right at the moment these acquire real sources with
 * different refresh characteristics — a directory count and a backup timestamp
 * do not move on the same clock — and not before.
 *
 * `DASHBOARD_REFRESH` for consistency with every other card on the dashboard.
 * It re-fetches a fixed seed, which changes nothing today; the behaviour is
 * what will still be right if the data ever becomes real.
 */
export const usePlatformOverview = () =>
  useQuery({
    queryKey: platformKeys.overview(),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.PLATFORM.OVERVIEW);
      return toPlatformOverview(
        platformOverviewResponseSchema.parse(response.data).data
      );
    },
    retry: retryUnlessClientError,
    ...DASHBOARD_REFRESH,
  });
