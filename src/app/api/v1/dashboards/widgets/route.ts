import { mockRoute, okJson } from "@/mocks/handler";
import { mockStore } from "@/mocks/store";

/**
 * `GET /api/v1/dashboards/widgets` — the widget library, §7.12.
 *
 * Open to any authenticated session, because every role's dashboard has to know
 * which widgets it was assigned (FR-ADM-06, FR-DASH-01). Editing the assignment
 * is the Super User's job and lives on the `[id]` route.
 *
 * Not paginated: FR-DASH-04 caps a dashboard at a handful of widgets and the
 * prototype's own library is five (`state.dashWidgets`). A pager on five rows
 * would be ceremony.
 */
export const GET = mockRoute({}, () =>
  okJson({ items: mockStore().dashboardWidgets })
);
