import { getStatusCode } from "@/lib/api-error";

/**
 * A 4xx is an answer, not a failure to get one.
 *
 * The client's default is one retry, which is right for a dropped connection and
 * wrong for a 404 or a 403: the second request gets the same reply, and the only
 * effect is that the error state — the "not found" screen, the "you may not read
 * this" message — arrives a second late. Retry the transient, not the decided.
 *
 * Promoted here from `features/actions/api/queries.ts` when `features/summaries`
 * became the second caller. Every detail query in the app wants this predicate:
 * a detail route is the one shape where a 404 is a routine, expected answer
 * rather than an outage.
 */
export const retryUnlessClientError = (
  failureCount: number,
  error: unknown
): boolean => {
  const status = getStatusCode(error);
  if (status !== null && status >= 400 && status < 500) return false;
  return failureCount < 1;
};
