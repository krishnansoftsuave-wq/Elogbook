import { ROLES, type Role } from "@/constants/roles";

/**
 * An administrator's permission list is literally `["*"]` — the wildcard IS the
 * contract (`authentication_flow.md` §5, §6). Never expand it into a concrete
 * list: doing so would silently cap an administrator at whatever this build
 * happened to know about.
 */
export const WILDCARD_PERMISSION = "*";

/**
 * The §6 permission table, transcribed verbatim. Order matches the document so
 * a future contract revision diffs cleanly against it.
 *
 * This is the *base* role set. §6 also lets an Administrator create custom
 * roles with their own permissions through the admin API, which is why nothing
 * downstream may treat this table as the closed set of possible permissions —
 * it is the set this build can name, not the set the backend can send.
 */
export const ROLE_PERMISSIONS = {
  [ROLES.OPERATOR]: [
    "shift:read",
    "summary:read",
    "assistant:query",
    "action:read",
    "action:write",
  ],
  [ROLES.SUPERVISOR]: [
    "shift:read",
    "summary:read",
    "summary:comment",
    "assistant:query",
    "action:read",
    "action:write",
    "action:confirm",
    "action:assign",
    "report:read",
  ],
  [ROLES.MANAGEMENT]: [
    "shift:read",
    "summary:read",
    "assistant:query",
    "action:read",
    "report:read",
    "analytics:read",
  ],
  [ROLES.ADMINISTRATOR]: [WILDCARD_PERMISSION],
  [ROLES.SUPER_USER]: [
    "dashboard:configure",
    "widget:assign",
    "metric:control",
    "access:control",
    "user:read",
  ],
} as const satisfies Record<Role, readonly string[]>;

/**
 * Every permission string this build can name, derived from the table above so
 * the union and the data can never drift apart. Used to *author* requirements
 * in code (route policy, guards, nav); a permission list arriving from `/me` is
 * parsed as an open `string[]`, never against this union.
 */
export type Permission = (typeof ROLE_PERMISSIONS)[Role][number];
