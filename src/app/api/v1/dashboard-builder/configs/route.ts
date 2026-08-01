import { mockRoute, okJson } from "@/mocks/handler";
import { mockStore } from "@/mocks/store";

/**
 * `GET /api/v1/dashboard-builder/configs` — the list screen, one row per
 * role's dashboard. ⚠️ PROTOTYPE-ONLY, see `features/dashboard-builder/schemas.ts`.
 *
 * Gated on `dashboard:configure` (not open like `GET /dashboards/widgets`):
 * unlike the widget catalog, a dashboard config's status, version and
 * affected-user-count are configuration data about *other* roles' dashboards,
 * not something an operational role needs to read for its own screen.
 */
export const GET = mockRoute({ permission: "dashboard:configure" }, () =>
  okJson({ items: mockStore().dashboardConfigs })
);
