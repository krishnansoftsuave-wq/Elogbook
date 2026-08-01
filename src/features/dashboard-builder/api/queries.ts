"use client";

import { useQuery } from "@tanstack/react-query";

import { API_ENDPOINTS } from "@/constants/api";
import { dashboardBuilderKeys } from "@/features/dashboard-builder/api/keys";
import {
  dashboardConfigDetailResponseSchema,
  dashboardConfigListResponseSchema,
  dashboardVersionListResponseSchema,
  libraryResponseSchema,
  toDashboardConfig,
  toDashboardVersion,
  toLibraryWidget,
} from "@/features/dashboard-builder/schemas";
import { api } from "@/lib/api-client";

/**
 * ⚠️ PROTOTYPE-ONLY, see `features/dashboard-builder/schemas.ts`.
 *
 * The list screen — one row per role's dashboard.
 */
export const useDashboardConfigs = () =>
  useQuery({
    queryKey: dashboardBuilderKeys.configs(),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.DASHBOARD_BUILDER.CONFIGS);
      const { items } = dashboardConfigListResponseSchema.parse(
        response.data
      ).data;
      return items.map(toDashboardConfig);
    },
  });

/** The builder screen's own dashboard. */
export const useDashboardConfig = (role: string) =>
  useQuery({
    queryKey: dashboardBuilderKeys.config(role),
    queryFn: async () => {
      const response = await api.get(
        API_ENDPOINTS.DASHBOARD_BUILDER.CONFIG(role)
      );
      return toDashboardConfig(
        dashboardConfigDetailResponseSchema.parse(response.data).data
      );
    },
    enabled: Boolean(role),
  });

/** The widget library sheet, scoped to which widgets this role's dashboard already has. */
export const useDashboardLibrary = (role: string) =>
  useQuery({
    queryKey: dashboardBuilderKeys.library(role),
    queryFn: async () => {
      const response = await api.get(
        API_ENDPOINTS.DASHBOARD_BUILDER.LIBRARY(role)
      );
      const { items } = libraryResponseSchema.parse(response.data).data;
      return items.map(toLibraryWidget);
    },
    enabled: Boolean(role),
  });

/** The Publish & Versions screen's history table. */
export const useDashboardVersions = (role: string) =>
  useQuery({
    queryKey: dashboardBuilderKeys.versions(role),
    queryFn: async () => {
      const response = await api.get(
        API_ENDPOINTS.DASHBOARD_BUILDER.VERSIONS(role)
      );
      const { items } = dashboardVersionListResponseSchema.parse(
        response.data
      ).data;
      return items.map(toDashboardVersion);
    },
    enabled: Boolean(role),
  });
