"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { FullPageSpinner } from "@/components/layout/FullPageSpinner";
import { ROUTES } from "@/constants/routes";
import { useSession } from "@/features/auth/hooks/useSession";
import { homeForSession } from "@/lib/auth/access";
import { clearSessionCookie } from "@/lib/auth/sessionCookie";

/**
 * Entry point and the neutral authenticated landing the edge proxy falls back
 * to, since permissions are not knowable there. It forwards each session to the
 * most privileged route it can actually enter.
 */
export default function Home() {
  const router = useRouter();
  const { session, permissions, isLoading } = useSession();

  useEffect(() => {
    if (isLoading) return;

    if (!session) {
      // The marker cookie outlives a tab-scoped session: sessionStorage is
      // per-tab, the cookie is per-browser-session, so a second tab arrives
      // here with a marker and no token. Left in place, the proxy would bounce
      // that tab off the login page straight back to `/` forever. Expiring the
      // stale marker ends the chain on the first pass.
      clearSessionCookie();
      router.replace(ROUTES.LOGIN);
      return;
    }

    router.replace(homeForSession(permissions));
  }, [isLoading, permissions, router, session]);

  return <FullPageSpinner label="Taking you to your workspace…" />;
}
