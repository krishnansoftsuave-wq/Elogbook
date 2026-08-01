"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { API_ENDPOINTS } from "@/constants/api";
import type { Role } from "@/constants/roles";
import { dashboardKeys } from "@/features/dashboards/api/keys";
import {
  dashboardWidgetDetailResponseSchema,
  toDashboardWidget,
  type DashboardWidget,
} from "@/features/dashboards/schemas";
import { api } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/api-error";

interface UpdateDashboardWidgetInput {
  id: string;
  assignedRoles: readonly Role[];
  enabled: boolean;
}

/**
 * **FR-ADM-06** / **FR-DASH-02** — the Super User "assign[s] widgets to
 * roles" and "control[s] which metrics each role sees". Gated server-side on
 * `dashboard:configure` (`PUT /dashboards/widgets/:id`); `ADMIN_DASHBOARDS`
 * enforces the same permission at the route.
 *
 * A `PUT` of the whole assignment (roles + enabled) rather than two separate
 * patches, matching `useUpdateShiftConfig`'s reasoning: a retry under
 * **NFR-12** must land the same pair of values, not compound a partial write
 * against whatever the server now holds.
 *
 * Cache is written twice for the same reason `useUpdateWorkflow` is:
 * `setQueryData` settles this row immediately, and `invalidateQueries`
 * refetches because the operator-facing `Dashboard` reads the same
 * `dashboardKeys.widgets()` list — an assignment changed here has to reach
 * the role it was just granted to, not only this table.
 */
export const useUpdateDashboardWidget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      assignedRoles,
      enabled,
    }: UpdateDashboardWidgetInput) => {
      const response = await api.put(API_ENDPOINTS.DASHBOARDS.WIDGET(id), {
        assigned_roles: assignedRoles,
        enabled,
      });
      return toDashboardWidget(
        dashboardWidgetDetailResponseSchema.parse(response.data).data
      );
    },
    onSuccess: (widget) => {
      queryClient.setQueryData<DashboardWidget[]>(
        dashboardKeys.widgets(),
        (current) =>
          current?.map((candidate) =>
            candidate.id === widget.id ? widget : candidate
          )
      );
      queryClient.invalidateQueries({ queryKey: dashboardKeys.widgets() });
      toast.success(`${widget.label} updated`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};
