import type { z } from "zod";

import { AD_GROUP_TO_ROLE, AD_GROUP_VALUES } from "@/constants/roles";
import { meDataSchema } from "@/features/auth/schemas";
import { rolesForGroups, unionPermissions } from "@/lib/auth/permissions";
import {
  decodeMockToken,
  isTokenExpired,
  type MockTokenPayload,
} from "@/mocks/auth/token";

/**
 * Typing the resolved session as the schema the client parses means the mock
 * cannot drift from what `GET /me` is validated against — a field rename in
 * `meDataSchema` breaks this file at compile time.
 */
type MeData = z.infer<typeof meDataSchema>;

/**
 * §5, verbatim. Worker 5 renders this on the access-denied screen and the
 * contract calls for "a clear 'access denied — contact an administrator'
 * screen, not a generic error", so the wording is part of the contract.
 */
export const UNMAPPED_ACCOUNT_MESSAGE =
  "Access denied: your AD account is not mapped to any platform role. Contact an administrator to request access.";

/**
 * §3 lists these as 401 causes but, unlike the deny message above, never pins
 * their wording. Kept distinct from one another so a developer reading the
 * network tab can tell which branch fired.
 */
export const MISSING_BEARER_MESSAGE =
  "Missing or malformed Authorization header. Expected 'Authorization: Bearer <token>'.";
export const INVALID_TOKEN_MESSAGE = "Invalid access token.";
export const EXPIRED_TOKEN_MESSAGE = "Access token has expired.";

/**
 * Own properties only. `AD_GROUP_TO_ROLE` is a plain object, so `in` would
 * report "constructor" and "__proto__" as valid groups — and since a mock token
 * is unsigned, a forged one can carry exactly those. Left unfiltered they reach
 * `rolesForGroups`, survive its truthiness check as inherited Object members,
 * and then crash `unionPermissions` on a lookup that returns undefined.
 */
const isKnownGroup = (group: string): boolean =>
  Object.hasOwn(AD_GROUP_TO_ROLE, group);

/** §4: every group must exist in the roles table. Order preserved so the error names what was sent. */
export const unknownGroups = (groups: readonly string[]): string[] =>
  groups.filter((group) => !isKnownGroup(group));

/**
 * §4's 422 message, shape for shape:
 *   "Unknown AD group(s): SOME-GROUP. Valid groups: A, B, C"
 *
 * Deliberate deviation: the valid list is `AD_GROUP_VALUES`, i.e. sorted.
 * §4's example prints SUPERVISORS before SUPERUSERS, which is not alphabetical
 * and reads as incidental iteration order out of the backend's roles table
 * rather than a promise. The set is identical either way; a deterministic order
 * is the defensible choice for something a test may assert on.
 */
export const unknownGroupsMessage = (unknown: readonly string[]): string =>
  `Unknown AD group(s): ${unknown.join(", ")}. Valid groups: ${AD_GROUP_VALUES.join(", ")}`;

/**
 * Token payload → the seven §5 fields, or `null` when the groups map to no role.
 *
 * `null` is the §5 deny (BE-US001-5): an unmapped account is refused outright
 * rather than admitted with an empty permission list.
 */
export const resolveSession = (payload: MockTokenPayload): MeData | null => {
  const roles = rolesForGroups(payload.groups.filter(isKnownGroup));
  if (roles.length === 0) return null;

  return {
    subject: payload.subject,
    username: payload.username,
    display_name: payload.display_name,
    roles: [...roles],
    groups: [...payload.groups],
    permissions: [...unionPermissions(roles)],
    /**
     * Always `null` — full-plant access — for all five base roles. §5 defines
     * `null` as full-plant, and BRD §9.2 states every operational role has
     * full-plant visibility ("the client explicitly removed" area filtering).
     * §6 scopes an area restriction to Administrator-created *custom* roles, of
     * which this fixture set has none. Inventing a restriction here would
     * fabricate a requirement the client struck; the non-null branch is covered
     * in resolve.test.ts instead of in shipped fixture data.
     */
    area_scope: null,
  };
};

export type MockAuthResult =
  | { authenticated: true; session: MeData }
  | { authenticated: false; message: string };

const BEARER_PREFIX = "Bearer ";

/**
 * The whole 401 surface of §3 in one place: missing or malformed header,
 * undecodable token, expired token, or groups that map to no role.
 */
export const authenticate = (
  authorizationHeader: string | null
): MockAuthResult => {
  if (!authorizationHeader?.startsWith(BEARER_PREFIX)) {
    return { authenticated: false, message: MISSING_BEARER_MESSAGE };
  }

  const token = authorizationHeader.slice(BEARER_PREFIX.length).trim();
  const payload = token ? decodeMockToken(token) : null;
  if (!payload) return { authenticated: false, message: INVALID_TOKEN_MESSAGE };

  if (isTokenExpired(payload)) {
    return { authenticated: false, message: EXPIRED_TOKEN_MESSAGE };
  }

  const session = resolveSession(payload);
  if (!session) {
    return { authenticated: false, message: UNMAPPED_ACCOUNT_MESSAGE };
  }

  return { authenticated: true, session };
};

/** §3: a 403 keeps the session — the token is fine, this one action is not. */
export const forbiddenMessage = (permission: string): string =>
  `Forbidden: this action requires the '${permission}' permission.`;
