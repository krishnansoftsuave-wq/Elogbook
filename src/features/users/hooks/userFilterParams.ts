import { z } from "zod";

import { DEFAULT_PAGE_SIZE } from "@/constants/api";
import { roleSchema, userStatusSchema } from "@/types/user";
import type { UserFilters } from "@/features/users/types";

/**
 * (De)serialising `UserFilters` to and from a query string — shared by the
 * server-rendered page (reading the URL a request arrived with) and the
 * client hook (writing back to it on every change). Deliberately no
 * `"use client"` here: a Server Component page imports this directly. Mirrors
 * `features/audit/hooks/auditFilterParams.ts`.
 */

export const USER_FILTERS_DEFAULTS: UserFilters = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  search: "",
  role: "all",
  status: "all",
};

const parsePositiveInt = (value: string | null, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseRole = (value: string | null): UserFilters["role"] => {
  const result = roleSchema.or(z.literal("all")).safeParse(value);
  return result.success ? result.data : "all";
};

const parseStatus = (value: string | null): UserFilters["status"] => {
  const result = userStatusSchema.safeParse(value);
  return result.success ? result.data : "all";
};

/** A single-valued lookup over either `URLSearchParams` (client) or Next's
 * `searchParams` page prop, flattened to its first value (server). */
export type UserFilterParamGetter = (key: string) => string | null;

export const getterFromSearchParams =
  (searchParams: URLSearchParams): UserFilterParamGetter =>
  (key) =>
    searchParams.get(key);

export const getterFromPageSearchParams =
  (
    searchParams: Record<string, string | string[] | undefined>
  ): UserFilterParamGetter =>
  (key) => {
    const value = searchParams[key];
    return (Array.isArray(value) ? value[0] : value) ?? null;
  };

export const parseUserFilters = (get: UserFilterParamGetter): UserFilters => ({
  page: parsePositiveInt(get("page"), USER_FILTERS_DEFAULTS.page),
  pageSize: parsePositiveInt(get("pageSize"), USER_FILTERS_DEFAULTS.pageSize),
  search: get("search") ?? USER_FILTERS_DEFAULTS.search,
  role: parseRole(get("role")),
  status: parseStatus(get("status")),
});

/**
 * The reverse — omits a key entirely when it is at its default, so a cleared
 * filter's param disappears from the URL rather than sitting there as
 * `role=all`.
 */
export const userFiltersToSearchParams = (
  filters: UserFilters
): URLSearchParams => {
  const params = new URLSearchParams();

  if (filters.page !== USER_FILTERS_DEFAULTS.page) {
    params.set("page", String(filters.page));
  }
  if (filters.pageSize !== USER_FILTERS_DEFAULTS.pageSize) {
    params.set("pageSize", String(filters.pageSize));
  }
  if (filters.search !== USER_FILTERS_DEFAULTS.search) {
    params.set("search", filters.search);
  }
  if (filters.role !== USER_FILTERS_DEFAULTS.role) {
    params.set("role", filters.role);
  }
  if (filters.status !== USER_FILTERS_DEFAULTS.status) {
    params.set("status", filters.status);
  }

  return params;
};
