import {
  ROLE_PERMISSIONS,
  WILDCARD_PERMISSION,
  type Permission,
} from "@/constants/permissions";
import { AD_GROUP_TO_ROLE, ROLES, type Role } from "@/constants/roles";

/** Dedupes while keeping the order values first appeared. */
const dedupe = <TValue>(values: readonly TValue[]): TValue[] => [
  ...new Set(values),
];

/**
 * Whether a session holds what an action requires.
 *
 * `held` is deliberately `string[]` rather than `Permission[]`: it comes from
 * `GET /me`, and a custom role created through the admin API can carry a
 * permission this build has never heard of (§6). `required` is the closed union
 * because it is authored here in code.
 *
 * Semantics, both tested:
 * - `["*"]` in `held` satisfies anything — it is how §5 encodes administrator.
 * - An array of `required` means **all** of them (conjunction), not any. Gates
 *   in this app read "you need X and Y"; a gate wanting "either" should ask
 *   twice, which reads correctly at the call site.
 * - An empty `required` array means nothing is required, so it passes.
 * - A missing/absent `held` fails closed — a session still loading is not a
 *   session that is allowed.
 */
export const hasPermission = (
  held: readonly string[] | null | undefined,
  required: Permission | readonly Permission[]
): boolean => {
  if (!held || held.length === 0) return false;
  if (held.includes(WILDCARD_PERMISSION)) return true;

  const needed = typeof required === "string" ? [required] : required;
  return needed.every((permission) => held.includes(permission));
};

/**
 * FR-AUTH-03 — "where a user holds multiple roles, grant the highest access
 * with both roles' permissions combined". Administrator's `["*"]` absorbs
 * everything, so a union containing it collapses to the wildcard rather than
 * to a longer list that would mean less.
 */
export const unionPermissions = (
  roles: readonly Role[]
): readonly Permission[] => {
  if (roles.includes(ROLES.ADMINISTRATOR)) return [WILDCARD_PERMISSION];
  return dedupe(
    roles
      // `Object.hasOwn`, not a truthiness check: `ROLE_PERMISSIONS.constructor`
      // is inherited from `Object.prototype` and is truthy, so a forged role
      // name would spread a function and throw "is not iterable". Callers
      // upstream may hand us unvalidated strings — fail closed, don't crash.
      .filter((role) => Object.hasOwn(ROLE_PERMISSIONS, role))
      .flatMap((role) => [...ROLE_PERMISSIONS[role]])
  );
};

/**
 * AD groups → platform roles (§6). Unrecognised groups are dropped, which is
 * what produces the §5 deny path: a token whose groups map to no role resolves
 * to an empty list, and the backend answers 401 rather than admitting a session
 * with zero permissions.
 *
 * The `Object.hasOwn` guard is load-bearing, not defensive noise. `groups`
 * arrives from a token's claims — attacker-controlled input — and
 * `AD_GROUP_TO_ROLE["constructor"]` resolves to `Object.prototype.constructor`,
 * which is truthy. A plain `Boolean(role)` filter therefore admits any
 * inherited key as if it were a real role, and the resulting value blows up
 * downstream. Own keys only.
 */
export const rolesForGroups = (groups: readonly string[]): readonly Role[] =>
  dedupe(
    groups
      .filter((group) => Object.hasOwn(AD_GROUP_TO_ROLE, group))
      .map((group) => AD_GROUP_TO_ROLE[group])
  );
