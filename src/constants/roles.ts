/**
 * The five base roles the backend resolves AD groups into
 * (`authentication_flow.md` §6). Role names are for display only —
 * authorization is decided by `permissions`, which `GET /me` returns and which
 * an Administrator can extend with custom roles without a frontend redeploy
 * (§5, "rule of thumb").
 *
 * There is deliberately no role→home table here. `homeForSession` in
 * `lib/auth/access.ts` derives the landing route from the same permission table
 * the guards read; a hand-written table lost that property once and produced an
 * infinite redirect (see `access.test.ts`).
 */
export const ROLES = {
  OPERATOR: "operator",
  SUPERVISOR: "supervisor",
  MANAGEMENT: "management",
  ADMINISTRATOR: "administrator",
  SUPER_USER: "super_user",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_VALUES = Object.values(ROLES);

/** AD group → platform role, transcribed from the §6 table. */
export const AD_GROUP_TO_ROLE: Record<string, Role> = {
  "OLNG-ELOG-OPERATORS": ROLES.OPERATOR,
  "OLNG-ELOG-SUPERVISORS": ROLES.SUPERVISOR,
  "OLNG-ELOG-SUPERINTENDENTS": ROLES.MANAGEMENT,
  "OLNG-ELOG-ADMINS": ROLES.ADMINISTRATOR,
  "OLNG-ELOG-SUPERUSERS": ROLES.SUPER_USER,
};

/**
 * Every AD group that maps to a role, sorted so the "valid groups" list in a
 * §4 validation error is deterministic. Note this is not byte-identical to the
 * order §4's example message happens to print (it shows SUPERVISORS before
 * SUPERUSERS, which is not alphabetical) — the set is what matters.
 */
export const AD_GROUP_VALUES = Object.keys(AD_GROUP_TO_ROLE).sort();

export const ROLE_LABEL: Record<Role, string> = {
  [ROLES.OPERATOR]: "Operator",
  [ROLES.SUPERVISOR]: "Supervisor",
  [ROLES.MANAGEMENT]: "Management",
  [ROLES.ADMINISTRATOR]: "Administrator",
  [ROLES.SUPER_USER]: "Super User",
};

/**
 * Widening `ROLE_LABEL` once, here, so callers never have to narrow a `string`
 * back to `Role` to read it.
 */
const ROLE_LABEL_LOOKUP: Record<string, string> = ROLE_LABEL;

/**
 * The defensive lookup every consumer of `session.roles` needs.
 *
 * `roles` arrives from `GET /me` as an open `string[]` on purpose — §6 lets an
 * Administrator create custom roles this build has never heard of, and
 * `meDataSchema` documents why validating them against a closed enum would lock
 * that user out. The consequence is that indexing `ROLE_LABEL` directly with a
 * session role is unsound: the key may genuinely not be there. This returns the
 * raw value in that case, which is a usable label and never `undefined`.
 */
export const roleLabel = (role: string): string =>
  ROLE_LABEL_LOOKUP[role] ?? role;
