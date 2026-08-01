import { ROLE_LABEL, type Role } from "@/constants/roles";
import { mockRouteWithParams, notFound, okJson } from "@/mocks/handler";
import { mockStore, patchById, recordAudit } from "@/mocks/store";

/**
 * `POST /api/v1/dashboard-builder/configs/:role/versions/:versionId/restore`
 * — reverts the live config's widgets and layout to an archived version's
 * snapshot. Does not touch the version list itself: restoring is a write to
 * the *current* config, not a new publish, matching the prototype's
 * `dashPublish` Restore action having no version-number effect of its own.
 * ⚠️ PROTOTYPE-ONLY, see `features/dashboard-builder/schemas.ts`.
 */
export const POST = mockRouteWithParams<{ role: string; versionId: string }>(
  { permission: "dashboard:configure" },
  ({ session, params }) => {
    const config = mockStore().dashboardConfigs.find(
      (candidate) => candidate.role === params.role
    );
    if (!config) return notFound(`Dashboard for role "${params.role}"`);

    const version = mockStore().dashboardVersions.find(
      (candidate) =>
        candidate.id === params.versionId &&
        candidate.dashboard_id === config.id
    );
    if (!version) return notFound(`Version "${params.versionId}"`);

    const updated = patchById(mockStore().dashboardConfigs, config.id, {
      widgets: version.widgets_snapshot,
      layout_columns: version.layout_columns_snapshot,
      last_updated_at: new Date().toISOString().replace(/Z$/, "+00:00"),
    });
    if (!updated) return notFound(`Dashboard for role "${params.role}"`);

    recordAudit(
      session,
      "RESTORE_DASHBOARD_VERSION",
      `${updated.name} (${ROLE_LABEL[updated.role as Role] ?? updated.role}) → ${version.version}`
    );

    return okJson(updated);
  }
);
