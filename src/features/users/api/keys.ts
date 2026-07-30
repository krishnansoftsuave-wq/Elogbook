import type { UserFilters } from "@/features/users/types";

/**
 * The single source of query keys for this feature. Nothing may inline a key
 * array, and mutations invalidate through `userKeys.all`.
 */
export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (filters: UserFilters) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};
