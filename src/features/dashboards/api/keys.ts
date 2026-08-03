/**
 * The single source of query keys for this feature. Nothing may inline a key
 * array, and mutations invalidate through `dashboardKeys.all`.
 *
 * `widgets()` sits under `all` rather than beside it because the role-driven
 * dashboard (FR-DASH-01) reads the same list the Super User edits here — one
 * assignment change has to refresh both, and a shared prefix is what makes a
 * single `invalidateQueries` reach them.
 */
export const dashboardKeys = {
  all: ["dashboards"] as const,
  widgets: () => [...dashboardKeys.all, "widgets"] as const,
  /**
   * The signed-in user's own arrangement. No username in the key because there
   * is none in the request either — `/me/dashboard-layout` answers for the
   * bearer token (**FR-DASH-05**). `queryClient.clear()` on logout is what
   * stops one user's layout being served to the next.
   */
  myLayout: () => [...dashboardKeys.all, "my-layout"] as const,
};
