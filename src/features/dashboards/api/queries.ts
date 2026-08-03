"use client";

import { useQuery } from "@tanstack/react-query";

import { API_ENDPOINTS } from "@/constants/api";
import { dashboardKeys } from "@/features/dashboards/api/keys";
import {
  dashboardLayoutResponseSchema,
  dashboardWidgetListResponseSchema,
  toDashboardLayoutEntry,
  toDashboardWidget,
} from "@/features/dashboards/schemas";
import { api } from "@/lib/api-client";
import { retryUnlessClientError } from "@/lib/query-retry";

/**
 * The widget library — §7.12.
 *
 * Read by two very different screens: the Super User's configuration table
 * (FR-DASH-02), and every role's own dashboard, which needs to know which
 * widgets it was assigned (FR-DASH-01). `GET /dashboards/widgets` is open to
 * any authenticated session for that reason; only the write is gated.
 *
 * No `placeholderData` and no pagination: the library is five rows, so there is
 * no previous page worth keeping on screen.
 */
export const useDashboardWidgets = () =>
  useQuery({
    queryKey: dashboardKeys.widgets(),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.DASHBOARDS.WIDGETS);
      const page = dashboardWidgetListResponseSchema.parse(response.data).data;

      return page.items.map(toDashboardWidget);
    },
    retry: retryUnlessClientError,
  });

/**
 * This user's own arrangement — **FR-DASH-04**'s saved layout.
 *
 * An empty array is the normal answer, not a failure: it means "no
 * personalisation yet", and `applyLayout` turns that into the role's standard
 * order (**FR-DASH-01**). Nothing here needs a refresh interval — a layout only
 * changes when this user changes it, in this tab, through the mutation below.
 */
export const useMyDashboardLayout = () =>
  useQuery({
    queryKey: dashboardKeys.myLayout(),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.DASHBOARDS.MY_LAYOUT);
      const page = dashboardLayoutResponseSchema.parse(response.data).data;

      return page.items.map(toDashboardLayoutEntry);
    },
    retry: retryUnlessClientError,
  });
