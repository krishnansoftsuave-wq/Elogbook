import { roleLabel } from "@/constants/roles";
import { mockRouteWithParams, notFound, okJson } from "@/mocks/handler";
import { mockStore, nextId, patchById, recordAudit } from "@/mocks/store";

/** `v1.4` → `v1.5`. Falls back to `v1.1` for a dashboard never published before. */
const nextVersion = (current: string | null): string => {
  if (!current) return "v1.1";
  const match = /^v(\d+)\.(\d+)$/.exec(current);
  if (!match) return "v1.1";
  return `v${match[1]}.${Number(match[2]) + 1}`;
};

/**
 * `POST /api/v1/dashboard-builder/configs/:role/publish` — snapshots the
 * current draft as a new live version, archives the previous live version,
 * and marks the config `published`. ⚠️ PROTOTYPE-ONLY, "full mock version
 * snapshots" per the confirmed scope in `features/dashboard-builder/schemas.ts`.
 */
export const POST = mockRouteWithParams<{ role: string }>(
  { permission: "dashboard:configure" },
  ({ session, params }) => {
    const config = mockStore().dashboardConfigs.find(
      (candidate) => candidate.role === params.role
    );
    if (!config) return notFound(`Dashboard for role "${params.role}"`);

    const now = new Date().toISOString().replace(/Z$/, "+00:00");
    const version = nextVersion(config.published_version);

    mockStore().dashboardVersions = mockStore().dashboardVersions.map(
      (candidate) =>
        candidate.dashboard_id === config.id && candidate.status === "live"
          ? { ...candidate, status: "archived" as const }
          : candidate
    );

    mockStore().dashboardVersions.unshift({
      id: nextId("DVER"),
      dashboard_id: config.id,
      version,
      changed_by: session.display_name,
      changed_at: now,
      status: "live",
      widgets_snapshot: config.widgets,
      layout_columns_snapshot: config.layout_columns,
      changelog: ["Published from the current draft"],
    });

    const updated = patchById(mockStore().dashboardConfigs, config.id, {
      status: "published" as const,
      last_published_at: now,
      last_updated_at: now,
      published_version: version,
    });
    if (!updated) return notFound(`Dashboard for role "${params.role}"`);

    recordAudit(
      session,
      "PUBLISH_DASHBOARD",
      `${updated.name} (${roleLabel(updated.role)}) → ${version}`
    );

    const publishedVersion = mockStore().dashboardVersions.find(
      (candidate) =>
        candidate.dashboard_id === config.id && candidate.status === "live"
    );
    if (!publishedVersion) return notFound(`Version for role "${params.role}"`);

    return okJson({ config: updated, version: publishedVersion });
  }
);
