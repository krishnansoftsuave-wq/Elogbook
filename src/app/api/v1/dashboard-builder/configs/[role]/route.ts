import { ROLE_VALUES } from "@/constants/roles";
import { dashboardConfigUpdateSchema } from "@/features/dashboard-builder/schemas";
import {
  mockRouteWithParams,
  notFound,
  okJson,
  readJson,
} from "@/mocks/handler";
import { mockStore, patchById, recordAudit } from "@/mocks/store";

/**
 * `GET /api/v1/dashboard-builder/configs/:role` — one role's dashboard
 * config, for the builder screen. ⚠️ PROTOTYPE-ONLY, see
 * `features/dashboard-builder/schemas.ts`.
 */
export const GET = mockRouteWithParams<{ role: string }>(
  { permission: "dashboard:configure" },
  ({ params }) => {
    if (!ROLE_VALUES.includes(params.role as (typeof ROLE_VALUES)[number])) {
      return notFound(`Dashboard for role "${params.role}"`);
    }

    const config = mockStore().dashboardConfigs.find(
      (candidate) => candidate.role === params.role
    );
    if (!config) return notFound(`Dashboard for role "${params.role}"`);

    return okJson(config);
  }
);

/**
 * `PUT /api/v1/dashboard-builder/configs/:role` — reorder, enable/disable,
 * add/remove widgets, change layout columns, or set as default. The whole
 * editable surface in one write, same reasoning as `dashboardConfigUpdateSchema`'s
 * doc comment: a retry must land the same values, not compound a partial
 * write. Saving here does **not** publish — the config's `status` stays
 * whatever it already was, matching the prototype's "Changes are saved as a
 * draft" copy.
 */
export const PUT = mockRouteWithParams<{ role: string }>(
  { permission: "dashboard:configure" },
  async ({ request, session, params }) => {
    const config = mockStore().dashboardConfigs.find(
      (candidate) => candidate.role === params.role
    );
    if (!config) return notFound(`Dashboard for role "${params.role}"`);

    const body = await readJson(request, dashboardConfigUpdateSchema);
    if (!body.ok) return body.response;

    const updated = patchById(mockStore().dashboardConfigs, config.id, {
      widgets: body.data.widgets,
      assigned_roles: body.data.assigned_roles,
      layout_columns: body.data.layout_columns,
      is_default: body.data.is_default,
      last_updated_at: new Date().toISOString().replace(/Z$/, "+00:00"),
    });
    if (!updated) return notFound(`Dashboard for role "${params.role}"`);

    recordAudit(
      session,
      "SAVE_DASHBOARD_DRAFT",
      `${updated.name} (${updated.role})`
    );

    return okJson(updated);
  }
);
