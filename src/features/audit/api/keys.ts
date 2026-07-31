import type { AuditFilters } from "@/features/audit/types";

/**
 * There is no `detail` here, and its absence is the contract rather than an
 * omission: `/audit` exposes a list and nothing else, because §9.3's store is
 * append-only and a row has no sub-resource to reach for.
 */
export const auditKeys = {
  all: ["audit"] as const,
  lists: () => [...auditKeys.all, "list"] as const,
  list: (filters: AuditFilters) => [...auditKeys.lists(), filters] as const,
};
