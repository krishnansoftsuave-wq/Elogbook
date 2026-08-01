import { WILDCARD_PERMISSION } from "@/constants/permissions";
import { roleWriteWireSchema } from "@/features/admin/schemas";
import {
  conflict,
  mockRouteWithParams,
  notFound,
  okJson,
  readJson,
} from "@/mocks/handler";
import { mockStore, patchById, recordAudit } from "@/mocks/store";

/**
 * `GET /api/v1/admin/roles/:id` — one role, for the Edit form. The list
 * endpoint already carries every field this needs; this exists because the
 * Edit route only has the id until it loads.
 */
export const GET = mockRouteWithParams<{ id: string }>(
  { permission: WILDCARD_PERMISSION },
  ({ params }) => {
    const role = mockStore().roles.find(
      (candidate) => candidate.id === params.id
    );
    if (!role) return notFound(`Role ${params.id}`);

    return okJson(role);
  }
);

/**
 * `PUT /api/v1/admin/roles/:id` — **FR-ADM-02**'s edit half. A whole-object
 * replace, like `useUpdateShiftConfig`, so a retry under **NFR-12** lands the
 * same values rather than compounding a partial write.
 *
 * A base role's `ad_group` is pinned to its existing value regardless of what
 * the client sends: the five (plus the §6.1/§6.6 roles this seed carries) are
 * AD's access model (**FR-AUTH-02**) — the mapping itself is governed
 * externally by the OLNG AD admin, not this form. Name, permissions and data
 * scope are not part of that mapping, so an Administrator may still adjust
 * them. `member_count` and `type` are not in `roleWriteWireSchema`, so neither
 * can be smuggled in by a client that already knows a role's id.
 */
export const PUT = mockRouteWithParams<{ id: string }>(
  { permission: WILDCARD_PERMISSION },
  async ({ request, session, params }) => {
    const existing = mockStore().roles.find(
      (candidate) => candidate.id === params.id
    );
    if (!existing) return notFound(`Role ${params.id}`);

    const body = await readJson(request, roleWriteWireSchema);
    if (!body.ok) return body.response;

    const role = patchById(mockStore().roles, params.id, {
      name: body.data.name,
      ad_group:
        existing.type === "base" ? existing.ad_group : body.data.ad_group,
      permissions: body.data.permissions,
      data_scope: body.data.data_scope,
    });
    if (!role) return notFound(`Role ${params.id}`);

    recordAudit(session, "UPDATE_ROLE", role.name);

    return okJson(role);
  }
);

/**
 * `DELETE /api/v1/admin/roles/:id` — §6 / FR-ADM-02.
 *
 * Two conflicts, both surfaced as 409 rather than a client-side guard, so the
 * rule lives in one place: the API, not every screen that might delete a
 * role.
 *
 * - **A base role can never be deleted.** The five (plus the §6.1/§6.6 roles
 *   this seed also carries) are the platform's own access model, not
 *   something an Administrator authored.
 * - **A custom role with members cannot be deleted out from under them.**
 *   The prototype's own delete button does exactly this — it never opens a
 *   confirmation, it toasts `"<role> delete blocked — role in use"`
 *   (`app-source.txt` 1579) — so a role with `member_count > 0` answers the
 *   same way here rather than silently orphaning those members' access.
 */
export const DELETE = mockRouteWithParams<{ id: string }>(
  { permission: WILDCARD_PERMISSION },
  ({ session, params }) => {
    const role = mockStore().roles.find(
      (candidate) => candidate.id === params.id
    );
    if (!role) return notFound(`Role ${params.id}`);

    if (role.type === "base") {
      return conflict(`${role.name} is a base role and cannot be deleted.`);
    }

    if (role.member_count > 0) {
      return conflict(`${role.name} delete blocked — role in use`);
    }

    mockStore().roles = mockStore().roles.filter(
      (candidate) => candidate.id !== params.id
    );

    recordAudit(session, "DELETE_ROLE", role.name);

    return okJson({ id: role.id });
  }
);
