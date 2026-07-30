"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { FullPageSpinner } from "@/components/layout/FullPageSpinner";
import type { Permission } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { useSession } from "@/features/auth/hooks/useSession";
import { homeForSession } from "@/lib/auth/access";
import { hasPermission } from "@/lib/auth/permissions";
import { safeReturnTo } from "@/lib/auth/returnTo";

interface RoleGuardProps {
  /**
   * Permissions required to enter, ALL of them. Omit to allow any signed-in
   * session.
   */
  require?: readonly Permission[];
  children: ReactNode;
}

/**
 * Layer 2 of 3 (AGENTS.md §3) and the authoritative check — the edge proxy sees
 * only a non-secret marker cookie and cannot know a permission, so it may let
 * anyone this far.
 *
 * It gates on permissions, never on a role name: §5's rule of thumb is
 * `permissions.includes("action:write")`, not `roles.includes("operator")`,
 * because an Administrator can mint a custom role without a frontend redeploy.
 * The name `RoleGuard` is kept deliberately — the architecture and security
 * standards both name this file as "the authoritative check", and renaming it
 * would leave those documents pointing at a file that no longer exists.
 *
 * Hiding a nav item is not access control (FR-ADM-03). This is the gate; the
 * sidebar filter is cosmetic, and a hidden route typed into the address bar
 * still lands here.
 */
export const RoleGuard = ({ require, children }: RoleGuardProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { session, permissions, isLoading } = useSession();

  const isAllowed =
    Boolean(session) && (!require || hasPermission(permissions, require));

  useEffect(() => {
    // Deciding before the session is known would bounce a signed-in user on
    // every refresh; rendering children before it is known would flash
    // protected content. Wait, then decide.
    if (isLoading) return;

    if (!session) {
      const returnTo = safeReturnTo(pathname);
      router.replace(
        returnTo
          ? `${ROUTES.LOGIN}?returnTo=${encodeURIComponent(returnTo)}`
          : ROUTES.LOGIN
      );
      return;
    }

    // A wrong-permission visit goes to where this session does belong, never to
    // a dead-end error page. `homeForSession` only returns somewhere this
    // session can enter, so this cannot ping-pong.
    if (!isAllowed) router.replace(homeForSession(permissions));
  }, [isAllowed, isLoading, pathname, permissions, router, session]);

  if (!isAllowed) return <FullPageSpinner label="Checking your access…" />;

  return <>{children}</>;
};
