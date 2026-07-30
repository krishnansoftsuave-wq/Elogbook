import { NextResponse, type NextRequest } from "next/server";

import { ROUTES } from "@/constants/routes";
import { isProtectedRoute } from "@/lib/auth/access";
import { safeReturnTo } from "@/lib/auth/returnTo";
import { SESSION_COOKIE, SESSION_COOKIE_VALUE } from "@/lib/auth/sessionCookie";

/**
 * Layer 1 of 3 (AGENTS.md §3) and explicitly best-effort. Next.js 16 renamed
 * the `middleware` convention to `proxy`; its own guide is blunt about the
 * limit — Proxy "should not be used as a full session management or
 * authorization solution" — so this does the cheap optimistic check and nothing
 * else.
 *
 * It reads one non-secret marker cookie. It cannot read a permission, and it no
 * longer reads a role: the previous build carried `elogbook_role` in a
 * client-writable cookie and let the edge route on it, which made a forged
 * string a privilege decision. Authorization happens in `RoleGuard` (layer 2,
 * authoritative) and in the backend (the real authority, FR-ADM-03). The worst
 * a forged marker achieves here is passage to a guard that bounces it.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionMarker =
    request.cookies.get(SESSION_COOKIE)?.value === SESSION_COOKIE_VALUE;

  if (isProtectedRoute(pathname) && !hasSessionMarker) {
    const loginUrl = new URL(ROUTES.LOGIN, request.url);
    // Same-origin by construction here, but validated anyway: this value is
    // about to be handed back to the browser as a query parameter, and the
    // login page must be able to trust what it reads.
    const returnTo = safeReturnTo(`${pathname}${search}`);
    if (returnTo) loginUrl.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(loginUrl);
  }

  // Already signed in and sitting on the login page. Which home that is depends
  // on permissions the edge cannot see, so this sends them to the neutral
  // authenticated landing at `/`, which reads the session and forwards. Exact
  // match, never a prefix: `/auth/callback` and `/auth/access-denied` must be
  // reachable with a marker present or the sign-in chain cannot complete.
  if (hasSessionMarker && pathname === ROUTES.LOGIN) {
    return NextResponse.redirect(new URL(ROUTES.HOME, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.\\w+$).*)"],
};
