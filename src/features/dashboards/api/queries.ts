"use client";

import { useQuery } from "@tanstack/react-query";

import { API_ENDPOINTS } from "@/constants/api";
import { dashboardKeys } from "@/features/dashboards/api/keys";
import {
  dashboardWidgetListResponseSchema,
  toDashboardWidget,
} from "@/features/dashboards/schemas";
import { api } from "@/lib/api-client";

/**
 * §7.12 — the widget catalog. `GET /dashboards/widgets` is open to any
 * authenticated session (every role's dashboard has to know what it was
 * assigned); this hook backs both the operator-facing `Dashboard` and the
 * Super User's assignment table on `/admin/dashboards` — one read, two
 * consumers, so a widget added here appears in both without a second query.
 */
export const useDashboardWidgets = () =>
  useQuery({
    queryKey: dashboardKeys.widgets(),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.DASHBOARDS.WIDGETS);
      const { items } = dashboardWidgetListResponseSchema.parse(
        response.data
      ).data;
      return items.map(toDashboardWidget);
    },
  });
