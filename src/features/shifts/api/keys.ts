/**
 * Query keys for the shift context. One resource today (`/shifts/current`), but
 * it gets a factory anyway: nothing in this repo may inline a key array, and a
 * shift *history* endpoint is the obvious next member once FR-HOME-04's
 * "previous shifts" has a contract behind it.
 */
export const shiftKeys = {
  all: ["shifts"] as const,
  current: () => [...shiftKeys.all, "current"] as const,
};
