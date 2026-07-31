import { dashboardWidgetUpdateSchema } from "@/features/dashboards/schemas";
import {
  mockRouteWithParams,
  notFound,
  okJson,
  readJson,
} from "@/mocks/handler";
import { findById, mockStore, patchById, recordAudit } from "@/mocks/store";

/**
 * `PUT /api/v1/dashboards/widgets/:id` — **FR-ADM-06**: the Super User "assign[s]
 * widgets to specific roles" and "control[s] which metrics are visible for each
 * role".
 *
 * Gated on `dashboard:configure`, which only the Super User role holds — an
 * Administrator reaches it through the wildcard. FR-ADM-07 is the reason no
 * other role can: "Regular users do not have full dashboard-creation access."
 */
export const PUT = mockRouteWithParams<{ id: string }>(
  { permission: "dashboard:configure" },
  async ({ request, session, params }) => {
    if (!findById(mockStore().dashboardWidgets, params.id)) {
      return notFound(`Widget ${params.id}`);
    }

    const body = await readJson(request, dashboardWidgetUpdateSchema);
    if (!body.ok) return body.response;

    const updated = patchById(mockStore().dashboardWidgets, params.id, {
      assigned_roles: body.data.assigned_roles,
      enabled: body.data.enabled,
    });
    if (!updated) return notFound(`Widget ${params.id}`);

    // FR-DASH-02's widget-to-role assignment. Nobody's role changed.
    recordAudit(session, "ASSIGN_WIDGET", `${updated.id} assignment`);

    return okJson(updated);
  }
);
