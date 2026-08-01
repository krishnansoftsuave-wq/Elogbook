import { mockRouteWithParams, notFound, okJson } from "@/mocks/handler";
import { mockStore } from "@/mocks/store";

/**
 * `GET /api/v1/dashboard-builder/configs/:role/versions` — newest first, for
 * the Publish & Versions screen. ⚠️ PROTOTYPE-ONLY, see
 * `features/dashboard-builder/schemas.ts`.
 */
export const GET = mockRouteWithParams<{ role: string }>(
  { permission: "dashboard:configure" },
  ({ params }) => {
    const config = mockStore().dashboardConfigs.find(
      (candidate) => candidate.role === params.role
    );
    if (!config) return notFound(`Dashboard for role "${params.role}"`);

    const items = mockStore()
      .dashboardVersions.filter((version) => version.dashboard_id === config.id)
      .sort((a, b) => b.changed_at.localeCompare(a.changed_at));

    return okJson({ items });
  }
);
