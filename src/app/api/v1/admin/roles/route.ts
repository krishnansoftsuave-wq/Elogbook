import { WILDCARD_PERMISSION } from "@/constants/permissions";
import { roleWriteWireSchema } from "@/features/admin/schemas";
import { mockRoute, okJson, paginate, readJson } from "@/mocks/handler";
import { mockStore, nextId, recordAudit } from "@/mocks/store";

/**
 * `GET /api/v1/admin/roles` — §6 / FR-ADM-02: the base roles plus any
 * Administrator-created custom roles.
 *
 * Wildcard-gated, matching `ROUTE_PERMISSIONS.ADMIN_ROLES`: role membership
 * and AD group mapping are administrative data about the platform's own
 * access model, not something an operational role needs to read.
 */
export const GET = mockRoute(
  { permission: WILDCARD_PERMISSION },
  ({ request }) =>
    okJson(paginate(mockStore().roles, new URL(request.url).searchParams))
);

/**
 * `POST /api/v1/admin/roles` — **FR-ADM-02**: "Create/edit/delete custom
 * roles with module permissions, data scope, and AD-group mapping; activate
 * immediately."
 *
 * Always creates a `custom` role — there is no way to mint a sixth base role
 * through this form; the five (plus the §6.1/§6.6 roles this seed carries)
 * are the platform's own access model (**FR-AUTH-02**). "Activate
 * immediately" is why there is no draft or pending status on the record: it
 * is live, with zero members, from the moment this returns.
 */
export const POST = mockRoute(
  { permission: WILDCARD_PERMISSION },
  async ({ request, session }) => {
    const body = await readJson(request, roleWriteWireSchema);
    if (!body.ok) return body.response;

    const role = {
      id: nextId("ROLE"),
      name: body.data.name,
      member_count: 0,
      ad_group: body.data.ad_group,
      type: "custom" as const,
      permissions: body.data.permissions,
      data_scope: body.data.data_scope,
    };

    mockStore().roles.push(role);

    recordAudit(session, "CREATE_ROLE", role.name);

    return okJson(role, 201);
  }
);
