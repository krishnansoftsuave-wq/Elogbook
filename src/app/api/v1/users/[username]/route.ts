import { WILDCARD_PERMISSION } from "@/constants/permissions";
import { userAccessUpdateSchema } from "@/features/users/schemas";
import {
  mockRouteWithParams,
  notFound,
  okJson,
  readJson,
} from "@/mocks/handler";
import { mockStore, recordAudit } from "@/mocks/store";

/**
 * `GET|PATCH /api/v1/users/:username` — one person in the directory.
 *
 * **Keyed by username**, because that is what the token carries, what
 * `recordAudit` writes, and what `/admin/notification-permissions/:username`
 * already uses. A synthetic id would be a second identifier needing
 * reconciliation with AD for no gain.
 *
 * ## The two verbs answer to different roles
 *
 * `GET` takes `user:read` — §6.5 gives the Super User read access to users.
 * `PATCH` takes the **wildcard**: FR-ADM-01 is an Administrator requirement, and
 * §6.5's Super User bullet says "Can view users", not manage them. This is the
 * first place the two admin-tree roles genuinely diverge.
 *
 * ## What may be changed, and what is AD's
 *
 * Only `status`. **FR-AUTH-02** governs group-to-role mapping "via the OLNG AD
 * admin" and §9.1 has the Administrator configure that *mapping* rather than
 * assign roles per person — so `roles` and `ad_groups` are read-only here, and
 * `display_name` is AD's too.
 *
 * `userAccessUpdateSchema` is a **strict** object, so a body carrying `roles`
 * is a 422 naming the field rather than a silent no-op. A client that tries to
 * edit AD's data should be told, not ignored.
 *
 * **Suspending is not deleting.** There is no `DELETE` on this route and there
 * should not be: identities originate in AD, and a platform that could remove
 * one would be removing a mirror rather than the thing. FR-AUTH-04 wants leaver
 * changes to "propagate ... promptly" and there is no AD feed to propagate from
 * yet — until there is, holding a leaver out of the platform is what an
 * Administrator can actually do.
 */
export const GET = mockRouteWithParams<{ username: string }>(
  { permission: "user:read" },
  ({ params }) => {
    const user = mockStore().users.find(
      (candidate) => candidate.username === params.username
    );
    if (!user) return notFound(`User ${params.username}`);

    return okJson(user);
  }
);

export const PATCH = mockRouteWithParams<{ username: string }>(
  { permission: WILDCARD_PERMISSION },
  async ({ request, session, params }) => {
    const user = mockStore().users.find(
      (candidate) => candidate.username === params.username
    );
    if (!user) return notFound(`User ${params.username}`);

    const body = await readJson(request, userAccessUpdateSchema);
    if (!body.ok) return body.response;

    // Mutated in place: `users` holds the records themselves, and `status` is
    // the only field this endpoint owns.
    user.status = body.data.status;

    /*
      FR-ADM-05 lists "settings changes" among what the audit trail must carry,
      and access is the setting with the widest blast radius.

      `UPDATE_USER_ACCESS`, not `UPDATE_ROLE`. This endpoint cannot change a
      role — roles come from AD and the schema rejects the field — so a row
      claiming one had changed would be a record of an event that did not occur,
      in a log §9.3 makes immutable.
    */
    recordAudit(
      session,
      "UPDATE_USER_ACCESS",
      `${user.username} → ${user.status}`
    );

    return okJson(user);
  }
);
