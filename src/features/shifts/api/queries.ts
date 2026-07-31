"use client";

import { useQuery } from "@tanstack/react-query";

import { API_ENDPOINTS } from "@/constants/api";
import { shiftKeys } from "@/features/shifts/api/keys";
import {
  currentShiftResponseSchema,
  toCurrentShift,
} from "@/features/shifts/schemas";
import { api } from "@/lib/api-client";
import { DASHBOARD_REFRESH } from "@/lib/query-refresh";

/**
 * The shift the plant is currently in — **FR-HOME-03**: "Define a shift as a
 * 12-hour period (06:00–06:15 overlap); shift boundaries configurable."
 *
 * **Configurable as of Phase 3b.** `GET /shifts/current` computes against the
 * stored `shiftConfig`, so an Administrator moving the boundary on
 * `/admin/shift-config` moves this — FR-HOME-03's "report/summary generation
 * aligns to them". `useUpdateShiftConfig` invalidates `shiftKeys.current()`, so
 * the banner follows without a reload.
 *
 * The times it carries are **plant-local instants** (`Asia/Muscat`) rendered
 * through `lib/datetime`. They were computed in UTC until 3b, which put
 * "10:00–22:00 GST" on the dashboard against FR-HOME-03's "06:00–18:00" —
 * `mocks/shifts/constants.ts` records the correction.
 */
export const useCurrentShift = () =>
  useQuery({
    queryKey: shiftKeys.current(),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.SHIFTS.CURRENT);
      return toCurrentShift(
        currentShiftResponseSchema.parse(response.data).data
      );
    },
    ...DASHBOARD_REFRESH,
  });
