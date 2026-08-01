"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { API_ENDPOINTS } from "@/constants/api";
import { dashboardBuilderKeys } from "@/features/dashboard-builder/api/keys";
import type { Role } from "@/constants/roles";
import {
  dashboardConfigDetailResponseSchema,
  dashboardPublishResponseSchema,
  dashboardRestoreResponseSchema,
  toDashboardBuilderWidgetWire,
  toDashboardConfig,
  type DashboardBuilderWidget,
  type DashboardConfig,
  type LayoutColumns,
} from "@/features/dashboard-builder/schemas";
import { api } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/api-error";

interface SaveDraftInput {
  role: string;
  widgets: readonly DashboardBuilderWidget[];
  assignedRoles: readonly Role[];
  layoutColumns: LayoutColumns;
  isDefault: boolean;
}

/**
 * ⚠️ PROTOTYPE-ONLY, see `features/dashboard-builder/schemas.ts`.
 *
 * Reorder, enable/disable, add/remove a widget, change layout columns, or
 * flip "set as default" — all funnel through this one mutation, matching the
 * prototype's "Changes are saved as a draft" copy: none of these promote the
 * config to `published`.
 */
export const useSaveDashboardDraft = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      role,
      widgets,
      assignedRoles,
      layoutColumns,
      isDefault,
    }: SaveDraftInput) => {
      const response = await api.put(
        API_ENDPOINTS.DASHBOARD_BUILDER.CONFIG(role),
        {
          widgets: widgets.map(toDashboardBuilderWidgetWire),
          assigned_roles: assignedRoles,
          layout_columns: layoutColumns,
          is_default: isDefault,
        }
      );
      return toDashboardConfig(
        dashboardConfigDetailResponseSchema.parse(response.data).data
      );
    },
    onSuccess: (config) => {
      queryClient.setQueryData<DashboardConfig>(
        dashboardBuilderKeys.config(config.role),
        config
      );
      queryClient.invalidateQueries({
        queryKey: dashboardBuilderKeys.configs(),
      });
      toast.success("Draft saved");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

/** Publishes the current draft as a new live version. */
export const usePublishDashboard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (role: string) => {
      const response = await api.post(
        API_ENDPOINTS.DASHBOARD_BUILDER.PUBLISH(role)
      );
      return dashboardPublishResponseSchema.parse(response.data).data;
    },
    onSuccess: (result, role) => {
      const config = toDashboardConfig(result.config);
      queryClient.setQueryData<DashboardConfig>(
        dashboardBuilderKeys.config(role),
        config
      );
      queryClient.invalidateQueries({
        queryKey: dashboardBuilderKeys.configs(),
      });
      queryClient.invalidateQueries({
        queryKey: dashboardBuilderKeys.versions(role),
      });
      toast.success(`${config.name} published as ${config.publishedVersion}`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

interface RestoreVersionInput {
  role: string;
  versionId: string;
  version: string;
}

/** Reverts the live config to an archived version's snapshot. */
export const useRestoreDashboardVersion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ role, versionId }: RestoreVersionInput) => {
      const response = await api.post(
        API_ENDPOINTS.DASHBOARD_BUILDER.RESTORE(role, versionId)
      );
      return toDashboardConfig(
        dashboardRestoreResponseSchema.parse(response.data).data
      );
    },
    onSuccess: (config, { version }) => {
      queryClient.setQueryData<DashboardConfig>(
        dashboardBuilderKeys.config(config.role),
        config
      );
      queryClient.invalidateQueries({
        queryKey: dashboardBuilderKeys.configs(),
      });
      toast.success(`Restored ${version}`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};
