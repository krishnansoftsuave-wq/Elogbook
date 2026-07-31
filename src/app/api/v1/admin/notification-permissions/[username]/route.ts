import { WILDCARD_PERMISSION } from "@/constants/permissions";
import { notificationPermissionUpdateSchema } from "@/features/admin/schemas";
import {
  mockRouteWithParams,
  notFound,
  okJson,
  readJson,
} from "@/mocks/handler";
import { mockStore, recordAudit } from "@/mocks/store";

/**
 * `PUT /api/v1/admin/notification-permissions/:username` — FR-NOT-01.
 *
 * Keyed by `username`, not by the display name the prototype's matrix uses
 * (`state.notifPerm`, app-source.txt 114). A display name is not an identity,
 * and this endpoint decides who gets told about an overdue safety action.
 *
 * The whole permission map is replaced rather than patched per cell: the
 * prototype's UI toggles one checkbox at a time (`togPerm`, line 2021) but saves
 * a row at a time (its "Save" button, line 2040), and a full replace is what
 * makes that idempotent under NFR-12.
 */
export const PUT = mockRouteWithParams<{ username: string }>(
  { permission: WILDCARD_PERMISSION },
  async ({ request, session, params }) => {
    const row = mockStore().notificationPermissions.find(
      (candidate) => candidate.username === params.username
    );
    if (!row)
      return notFound(`Notification permissions for ${params.username}`);

    const body = await readJson(request, notificationPermissionUpdateSchema);
    if (!body.ok) return body.response;

    row.permissions = body.data.permissions;

    recordAudit(session, "UPDATE_NOTIFICATION_PERMISSION", row.username);

    return okJson(row);
  }
);
