import type { EntryFilters } from "@/features/entries/types";

/**
 * The single source of query keys for this feature. Nothing may inline a key
 * array, and mutations invalidate through `entryKeys.all` (AGENTS.md §1).
 */
export const entryKeys = {
  all: ["entries"] as const,
  lists: () => [...entryKeys.all, "list"] as const,
  list: (filters: EntryFilters) => [...entryKeys.lists(), filters] as const,
  details: () => [...entryKeys.all, "detail"] as const,
  detail: (id: string) => [...entryKeys.details(), id] as const,
};
