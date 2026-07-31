import { z } from "zod";

import { ROLE_VALUES } from "@/constants/roles";

export const roleSchema = z.enum(ROLE_VALUES);

/**
 * A person in the admin directory — **a mirror of Active Directory, not a
 * record this platform owns**.
 *
 * ## Why the shape changed
 *
 * This was `{ id, name, email, role, status, createdAt }`: a synthetic id, a
 * single role, an email. It was written before any contract existed and none of
 * it survives contact with one.
 *
 * - **`username`, not `id`.** It is what the token carries, what `recordAudit`
 *   writes, and what `/admin/notification-permissions/:username` already keys
 *   on. A second identifier would need reconciling with AD for no gain.
 * - **`roles` is plural.** **FR-AUTH-03**: where a user holds multiple roles,
 *   grant "the highest access with both roles' permissions combined". The
 *   `maryam.alzadjali` fixture holds two, so a single-role field cannot describe
 *   the directory this build already ships.
 * - **No email.** Nothing in the auth flow carries one — not the token, not
 *   `GET /me`, not `MOCK_ACCOUNTS`. Modelling a field no source populates
 *   invites a screen that renders blanks.
 *
 * ## What is AD's and what is the platform's
 *
 * `adGroups` and `roles` are **derived from AD and read-only here**.
 * **FR-AUTH-02** governs group-to-role mapping "via the OLNG AD admin", and
 * §9.1 has the Administrator configure that mapping — not per-user role
 * assignment. Changing what a person can do means changing their AD groups, or
 * the group→role table (Phase 3c).
 *
 * `status` is the platform's own, and is the one field an Administrator edits
 * here. **FR-AUTH-04** wants leaver changes to "propagate ... promptly" and
 * there is no AD feed to propagate from yet, so suspending platform access is
 * the control that closes that gap in the meantime.
 *
 * Distinct from `SessionUser` in `features/auth`, which is the signed-in
 * identity `GET /me` returns — that one additionally carries resolved
 * permissions and area scope.
 */

/**
 * Two values, not three. The old `invited` had nothing to issue an invitation:
 * accounts originate in AD, so a person is either allowed into the platform or
 * held out of it.
 */
export const userStatusSchema = z.enum(["active", "suspended"]);

export const userWireSchema = z.object({
  username: z.string(),
  display_name: z.string(),
  /** Raw AD group memberships, exactly as the token carries them. */
  ad_groups: z.array(z.string()),
  /**
   * Resolved from `ad_groups`. An open string array rather than the role enum:
   * `authentication_flow.md` §6 is explicit that the backend may send a role
   * this build has never heard of, and a directory screen must list that person
   * rather than fail to parse the page they are on.
   */
  roles: z.array(z.string()),
  status: userStatusSchema,
  /** Null for someone who has never signed in. */
  last_seen_at: z.string().nullable(),
});

export const userSchema = z.object({
  username: z.string(),
  displayName: z.string(),
  adGroups: z.array(z.string()),
  roles: z.array(z.string()),
  status: userStatusSchema,
  lastSeenAt: z.string().nullable(),
});

export type UserWire = z.infer<typeof userWireSchema>;
export type User = z.infer<typeof userSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;

export const toUser = (wire: UserWire): User => ({
  username: wire.username,
  displayName: wire.display_name,
  adGroups: wire.ad_groups,
  roles: wire.roles,
  status: wire.status,
  lastSeenAt: wire.last_seen_at,
});
