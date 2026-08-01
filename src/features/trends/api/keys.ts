import type { TrendPeriod } from "@/features/trends/schemas";

/**
 * The single source of query keys for this feature. Nothing may inline a key
 * array, and mutations invalidate through `trendsKeys.all`.
 *
 * `period` is part of the key, not a param folded away — `GET /trends` answers
 * the whole screen for one window, so switching the pill is a different cache
 * entry, exactly like `userKeys.list` varying by `UserFilters`.
 */
export const trendsKeys = {
  all: ["trends"] as const,
  summaries: () => [...trendsKeys.all, "summary"] as const,
  summary: (period: TrendPeriod) =>
    [...trendsKeys.summaries(), period] as const,
};
