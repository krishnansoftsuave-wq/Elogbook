"use client";

import { useQuery } from "@tanstack/react-query";

import { API_ENDPOINTS } from "@/constants/api";
import { plantOpsKeys } from "@/features/plant-ops/api/keys";
import {
  plantOperationsResponseSchema,
  toPlantOperations,
} from "@/features/plant-ops/schemas";
import { api } from "@/lib/api-client";
import { DASHBOARD_REFRESH } from "@/lib/query-refresh";
import { retryUnlessClientError } from "@/lib/query-retry";

/**
 * The prototype's plant-operations data — all six cards from one request.
 *
 * One query rather than six: the prototype draws them from a single render
 * pass, they always appear together, and six keys would mean six requests for
 * one screen's worth of a payload that is a few kilobytes whole. If these
 * screens are ever ratified and acquire real sources — historian, maintenance
 * system, shipping schedule — that will be the moment to split them, because
 * only then will they have different refresh characteristics.
 *
 * `DASHBOARD_REFRESH` for consistency with every other card on the dashboard.
 * It re-fetches a fixed seed, which changes nothing; the behaviour is what will
 * still be right if the data ever becomes real.
 */
export const usePlantOperations = () =>
  useQuery({
    queryKey: plantOpsKeys.summary(),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.PLANT_OPERATIONS.SUMMARY);
      return toPlantOperations(
        plantOperationsResponseSchema.parse(response.data).data
      );
    },
    retry: retryUnlessClientError,
    ...DASHBOARD_REFRESH,
  });
