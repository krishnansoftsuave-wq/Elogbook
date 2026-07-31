import { MOCK_ACCOUNTS } from "@/mocks/auth/directory";
import { rolesForGroups } from "@/lib/auth/permissions";
import type { UserWire } from "@/types/user";

/**
 * The admin directory — **FR-ADM-01**.
 *
 * ## Seeded from `MOCK_ACCOUNTS`, and that is the whole point
 *
 * These are not new fixtures. They are the *same seven people* the AD directory
 * already holds, projected into the shape the admin screen reads. Inventing a
 * separate user list would create people no token could ever resolve — sign in
 * as one of them and `resolveSession` finds no groups, so the platform would be
 * listing users who cannot use it.
 *
 * `roles` is derived here rather than stored, by the same `rolesForGroups` the
 * auth path uses. That keeps one rule in one place: if the group→role table
 * changes, the directory follows without anybody remembering to update a seed.
 *
 * ## Everyone starts active, including the unmapped account
 *
 * `hamed.alsiyabi` belongs to `OLNG-CONTRACTORS`, which maps to no role, so his
 * `roles` resolves to `[]` and `GET /me` refuses him (§5's deny). He is still
 * listed: an Administrator needs to *see* the person whose AD groups grant
 * nothing, which is exactly the situation FR-AUTH-02's "deny access where no
 * group matches" produces. A directory that hid them would hide the problem.
 *
 * `last_seen_at` is null for everyone — nothing tracks sign-ins yet, and a
 * fabricated timestamp would be a fact about behaviour nobody has observed.
 *
 * PROVISIONAL field names, like every entity here.
 */
export const seedUsers = (): UserWire[] =>
  MOCK_ACCOUNTS.map((account) => ({
    username: account.username,
    display_name: account.displayName,
    ad_groups: [...account.groups],
    roles: [...rolesForGroups(account.groups)],
    status: "active" as const,
    last_seen_at: null,
  }));
