import type { SummaryFilters } from "@/features/summaries/types";

/**
 * The single source of query keys for this feature. Nothing may inline a key
 * array, and mutations invalidate through `summaryKeys.all`.
 *
 * `list(filters)` puts the whole filter object in the key, which is what makes
 * changing a filter refetch and cache automatically — the state-ownership rule
 * that keeps list state out of Zustand.
 *
 * There is deliberately **no `comments(id)` member**, unlike `actionKeys`.
 * `POST /summaries/:id/comments` has no `GET` counterpart: a summary's comments
 * arrive inside `GET /summaries/:id`, so the thread is part of the detail record
 * and posting invalidates `detail(id)`. A key for a resource that cannot be
 * fetched would invite exactly the query that 404s.
 */
export const summaryKeys = {
  all: ["summaries"] as const,
  lists: () => [...summaryKeys.all, "list"] as const,
  list: (filters: SummaryFilters) => [...summaryKeys.lists(), filters] as const,
  details: () => [...summaryKeys.all, "detail"] as const,
  detail: (id: string) => [...summaryKeys.details(), id] as const,
  /** The newest summary, for the dashboard's previous-shift widgets. */
  latest: () => [...summaryKeys.all, "latest"] as const,
};
