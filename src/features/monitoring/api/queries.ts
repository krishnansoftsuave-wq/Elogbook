"use client";

import { useQuery } from "@tanstack/react-query";

import { API_ENDPOINTS } from "@/constants/api";
import { monitoringKeys } from "@/features/monitoring/api/keys";
import {
  systemMonitoringResponseSchema,
  toSystemMonitoring,
} from "@/features/monitoring/schemas";
import { api } from "@/lib/api-client";
import { DASHBOARD_REFRESH } from "@/lib/query-refresh";
import { retryUnlessClientError } from "@/lib/query-retry";

/**
 * Platform telemetry — **FR-OBS-04**'s "**live view** of application usage".
 *
 * `DASHBOARD_REFRESH` is what makes it live, and it is the same one-minute
 * interval the operations dashboard uses. That is the deliberate difference
 * from the prototype, which re-randomises its own numbers every four seconds:
 * here the client re-asks the server and the server answers with what it
 * observed. Against a real backend this hook does not change at all — only the
 * figures stop being illustrative.
 *
 * The interval pauses in a background tab (`lib/query-refresh.ts`), which
 * matters more here than anywhere else: a control-room display left open
 * overnight would otherwise poll 1,440 times for nobody.
 */
export const useSystemMonitoring = (autoRefresh = true) =>
  useQuery({
    queryKey: monitoringKeys.system(),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.ADMIN.MONITORING);
      return toSystemMonitoring(
        systemMonitoringResponseSchema.parse(response.data).data
      );
    },
    retry: retryUnlessClientError,
    /*
      The prototype's Auto-refresh switch (`adminDashboard` 410). Turning it off
      stops the interval and nothing else — the data already fetched stays, and
      the Refresh button still works, which is what somebody reaches for when
      they have paused polling to read a number that keeps moving.
    */
    ...(autoRefresh ? DASHBOARD_REFRESH : {}),
  });
