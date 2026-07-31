import { matchesSearch, mockRoute, okJson, paginate } from "@/mocks/handler";
import { mockStore } from "@/mocks/store";
import { isActionOverdue } from "@/types/operations";

/**
 * `GET /api/v1/actions` — the pending-actions list, §7.6.
 *
 * Permission `action:read`, which Operator, Supervisor and Management all hold
 * (`ROLE_PERMISSIONS`); Super User does not, so this is another endpoint that
 * produces §3's 403 for a perfectly valid token.
 *
 * Filtering and paging happen here rather than in the client, because
 * `manualPagination` is the repo default (AGENTS.md §6) and a mock that returned
 * everything would let a table ship with its pagination wired wrongly and never
 * show it.
 *
 * **FR-PA-06** — `overdue=true` filters on the *derived* flag. There is no
 * overdue status to filter on, by design.
 */
export const GET = mockRoute({ permission: "action:read" }, ({ request }) => {
  const { searchParams } = new URL(request.url);
  const now = new Date();

  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const area = searchParams.get("area");
  const overdueOnly = searchParams.get("overdue") === "true";

  const filtered = mockStore().actions.filter((action) => {
    if (status && status !== "all" && action.status !== status) return false;
    if (priority && priority !== "all" && action.priority !== priority) {
      return false;
    }
    if (area && area !== "all" && action.area !== area) return false;
    if (overdueOnly && !isActionOverdue(action.due_at, action.status, now)) {
      return false;
    }
    return matchesSearch(
      searchParams.get("search"),
      action.id,
      action.title,
      action.equipment,
      action.area
    );
  });

  return okJson(paginate(filtered, searchParams));
});
