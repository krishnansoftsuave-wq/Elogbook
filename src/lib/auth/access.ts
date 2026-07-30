import type { Permission } from "@/constants/permissions";
import { HOME_CANDIDATES, ROUTE_PERMISSIONS, ROUTES } from "@/constants/routes";
import { hasPermission } from "@/lib/auth/permissions";

const POLICIES = Object.values(ROUTE_PERMISSIONS);

const NO_PERMISSIONS_REQUIRED: readonly Permission[] = [];

const covers = (pathname: string, prefix: string): boolean =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/**
 * The permissions a route demands, or an empty list when it demands none.
 *
 * The longest matching prefix wins, so a future policy on `/admin/audit` would
 * override the one on `/admin` rather than racing it on object key order.
 */
export const requiredPermissionsFor = (
  pathname: string
): readonly Permission[] =>
  POLICIES.filter((policy) => covers(pathname, policy.prefix)).sort(
    (a, b) => b.prefix.length - a.prefix.length
  )[0]?.permissions ?? NO_PERMISSIONS_REQUIRED;

/** Whether entering this route requires anything at all. */
export const isProtectedRoute = (pathname: string): boolean =>
  requiredPermissionsFor(pathname).length > 0;

/**
 * The UI half of FR-ADM-03 ("enforce RBAC independently at both API and UI
 * layers"). The API half is the backend's 401/403 — this never replaces it.
 *
 * `permissions` is an open `string[]` because `GET /me` may carry a permission
 * from an Administrator-created custom role that this build has never heard of
 * (`authentication_flow.md` §6). Absent or empty fails closed via
 * `hasPermission`.
 */
export const canAccess = (
  permissions: readonly string[] | null | undefined,
  pathname: string
): boolean => {
  const required = requiredPermissionsFor(pathname);
  if (required.length === 0) return true;
  return hasPermission(permissions, required);
};

/**
 * Where this session belongs — used for the root redirect and for a
 * wrong-permission bounce.
 *
 * Permission-first, with no role-precedence list to maintain: it returns the
 * most privileged landing route the session can actually enter, which is
 * exactly FR-AUTH-03's "highest access with both roles' permissions combined"
 * once `permissions` is already the union.
 *
 * The `find` is what makes it loop-proof. Every value it returns has just been
 * approved by `canAccess`, so a guard that redirects here can never send a
 * session somewhere the same guard would bounce it from again. A hand-written
 * role→home table lost that property once (`super_user`'s home sat in a tree
 * its role could not enter); deriving the answer from the same table the guard
 * reads means it cannot regress.
 *
 * The fallback is the §5 deny screen, not `/unauthorized`: a token that opens
 * no door at all is precisely "your AD account is not mapped to any platform
 * role", and that route is ungated so it terminates the chain.
 */
export const homeForSession = (
  permissions: readonly string[] | null | undefined
): string =>
  HOME_CANDIDATES.find((candidate) => canAccess(permissions, candidate)) ??
  ROUTES.ACCESS_DENIED;
