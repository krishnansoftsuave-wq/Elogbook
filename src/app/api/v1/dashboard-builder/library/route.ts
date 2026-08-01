import { mockRoute, okJson } from "@/mocks/handler";
import { mockStore } from "@/mocks/store";

/**
 * `GET /api/v1/dashboard-builder/library?role=operator` — the widget
 * library sheet. Returns the whole catalog with an `added` flag per widget
 * (matched by label against the target role's current dashboard, the same
 * signal `dashLibrary`'s `w[3]` flag uses) rather than filtering it out, so
 * the library can render the prototype's "Added" state instead of the
 * widget disappearing. ⚠️ PROTOTYPE-ONLY, see
 * `features/dashboard-builder/schemas.ts`.
 */
export const GET = mockRoute(
  { permission: "dashboard:configure" },
  ({ request }) => {
    const role = new URL(request.url).searchParams.get("role");
    const config = mockStore().dashboardConfigs.find(
      (candidate) => candidate.role === role
    );
    const addedLabels = new Set(
      (config?.widgets ?? []).map((widget) => widget.label)
    );

    const items = mockStore().dashboardLibrary.map((widget) => ({
      ...widget,
      added: addedLabels.has(widget.label),
    }));

    return okJson({ items });
  }
);
