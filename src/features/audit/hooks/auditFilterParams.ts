import { DEFAULT_PAGE_SIZE } from "@/constants/api";
import { auditActionSchema } from "@/features/audit/schemas";
import type { AuditFilters } from "@/features/audit/types";

/**
 * (De)serialising `AuditFilters` to and from a query string — shared by the
 * server-rendered page (reading the URL a request arrived with) and the
 * client hook (writing back to it on every change). Deliberately no
 * `"use client"` here: a Server Component page imports this directly.
 */

export const AUDIT_FILTERS_DEFAULTS: AuditFilters = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  username: "all",
  action: "all",
  from: "",
  to: "",
};

const parsePositiveInt = (value: string | null, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseAction = (value: string | null): AuditFilters["action"] => {
  const result = auditActionSchema.safeParse(value);
  return result.success ? result.data : "all";
};

/** A single-valued lookup over either `URLSearchParams` (client) or Next's
 * `searchParams` page prop, flattened to its first value (server). */
export type AuditFilterParamGetter = (key: string) => string | null;

export const getterFromSearchParams =
  (searchParams: URLSearchParams): AuditFilterParamGetter =>
  (key) =>
    searchParams.get(key);

export const getterFromPageSearchParams =
  (
    searchParams: Record<string, string | string[] | undefined>
  ): AuditFilterParamGetter =>
  (key) => {
    const value = searchParams[key];
    return (Array.isArray(value) ? value[0] : value) ?? null;
  };

export const parseAuditFilters = (
  get: AuditFilterParamGetter
): AuditFilters => ({
  page: parsePositiveInt(get("page"), AUDIT_FILTERS_DEFAULTS.page),
  pageSize: parsePositiveInt(get("pageSize"), AUDIT_FILTERS_DEFAULTS.pageSize),
  username: get("username") ?? AUDIT_FILTERS_DEFAULTS.username,
  action: parseAction(get("action")),
  from: get("from") ?? AUDIT_FILTERS_DEFAULTS.from,
  to: get("to") ?? AUDIT_FILTERS_DEFAULTS.to,
});

/**
 * The reverse — omits a key entirely when it is at its default, so a cleared
 * filter's param disappears from the URL rather than sitting there as
 * `username=all`.
 */
export const auditFiltersToSearchParams = (
  filters: AuditFilters
): URLSearchParams => {
  const params = new URLSearchParams();

  if (filters.page !== AUDIT_FILTERS_DEFAULTS.page) {
    params.set("page", String(filters.page));
  }
  if (filters.pageSize !== AUDIT_FILTERS_DEFAULTS.pageSize) {
    params.set("pageSize", String(filters.pageSize));
  }
  if (filters.username !== AUDIT_FILTERS_DEFAULTS.username) {
    params.set("username", filters.username);
  }
  if (filters.action !== AUDIT_FILTERS_DEFAULTS.action) {
    params.set("action", filters.action);
  }
  if (filters.from !== AUDIT_FILTERS_DEFAULTS.from) {
    params.set("from", filters.from);
  }
  if (filters.to !== AUDIT_FILTERS_DEFAULTS.to) {
    params.set("to", filters.to);
  }

  return params;
};
