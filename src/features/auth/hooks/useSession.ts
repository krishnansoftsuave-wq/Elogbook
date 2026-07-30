"use client";

import { useMe } from "@/features/auth/api/queries";
import type { SessionUser } from "@/features/auth/types";
import { useAuthStore } from "@/store/authStore";

export interface UseSessionResult {
  /** `null` until `GET /me` resolves, and whenever there is no session. */
  session: SessionUser | null;
  /**
   * The §5 permission union — an open `string[]`, because an Administrator can
   * create custom roles with permissions this build has never heard of. Feed it
   * to `hasPermission` rather than reading role names.
   */
  permissions: readonly string[];
  /** True while the store rehydrates, or while `GET /me` is in flight. */
  isLoading: boolean;
}

/**
 * The one hook every consumer reads for "who is signed in and what may they
 * do". It composes token presence (zustand) with `GET /me` (TanStack Query) so
 * no component has to know that the answer comes from two places.
 *
 * It deliberately exposes no "refused" state. §5's deny is owned by
 * `CallbackExchange`, which reads it off the sign-in mutation; a 401 reaching
 * `useMe` has already had the interceptor end the session, and the query it
 * landed on was destroyed by the cache clear rather than moved to `error`. A
 * flag derived from `me.error` here would read `false` forever — see
 * `useSignInExchange`.
 */
export const useSession = (): UseSessionResult => {
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const me = useMe();

  const session = me.data ?? null;

  return {
    session,
    permissions: session?.permissions ?? [],
    isLoading: !hasHydrated || (Boolean(token) && me.isPending),
  };
};
