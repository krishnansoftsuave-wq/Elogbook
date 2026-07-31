import type { ActionFilters } from "@/features/actions/types";

/**
 * The single source of query keys for this feature. Nothing may inline a key
 * array, and mutations invalidate through `actionKeys.all`.
 *
 * `list(filters)` puts the whole filter object in the key, which is what makes
 * changing a filter refetch and cache automatically — the state-ownership rule
 * that keeps list state out of Zustand.
 */
export const actionKeys = {
  all: ["actions"] as const,
  lists: () => [...actionKeys.all, "list"] as const,
  list: (filters: ActionFilters) => [...actionKeys.lists(), filters] as const,
  details: () => [...actionKeys.all, "detail"] as const,
  detail: (id: string) => [...actionKeys.details(), id] as const,
  comments: (id: string) => [...actionKeys.detail(id), "comments"] as const,
  /** Dashboard KPI tallies (FR-HOME-01). */
  statusCounts: () => [...actionKeys.all, "status-counts"] as const,
  /** Distinct areas behind the Area filter, fetched unfiltered. */
  areas: () => [...actionKeys.all, "areas"] as const,
  /** People an action may be assigned to (FR-PA-03) — a stand-in, see queries. */
  assignableOwners: () => [...actionKeys.all, "assignable-owners"] as const,
};
