"use client";

import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { API_ENDPOINTS } from "@/constants/api";
import { ROUTES } from "@/constants/routes";
import { authKeys } from "@/features/auth/api/keys";
import {
  devTokenResponseSchema,
  meResponseSchema,
  toSessionUser,
} from "@/features/auth/schemas";
import type { DevTokenRequest, SessionUser } from "@/features/auth/types";
import { api } from "@/lib/api-client";
import { broadcastLogout } from "@/lib/auth/tokenStorage";
import { useAuthStore } from "@/store/authStore";

/**
 * The whole sign-in exchange as one mutation: §4's stub-mode token mint, then
 * §5's `GET /me` verification that turns the token into a session.
 *
 * `GET /me` is driven imperatively here rather than observed through `useMe`,
 * and that is load-bearing. A 401 on it has the interceptor call `endSession`,
 * which clears the query cache synchronously before rethrowing —
 * `QueryCache.clear()` destroys the in-flight query, and a silently-cancelled
 * retryer never dispatches its error. An observing `useQuery` therefore stays
 * on `pending` forever and §5's deny screen never renders. A mutation's error
 * survives the same clear, so the refusal stays observable. Clearing the cache
 * on a 401 is a security requirement (FR-AUTH-05, shared plant-floor devices),
 * so the caller moves rather than the teardown.
 *
 * At cutover (tracker A-01) only the `/dev/token` call changes: the token
 * arrives from a real SSO exchange and everything downstream stays identical.
 */
export const useSignInExchange = () => {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: async (values: DevTokenRequest): Promise<SessionUser> => {
      const minted = await api.post(API_ENDPOINTS.AUTH.DEV_TOKEN, values);
      const token = devTokenResponseSchema.parse(minted.data).data;

      // Clear BEFORE the token lands: anything cached under the previous
      // session must never be readable by the one about to start.
      queryClient.clear();
      setSession(token.access_token, token.expires_in);

      const response = await api.get(API_ENDPOINTS.AUTH.ME);
      return toSessionUser(meResponseSchema.parse(response.data).data);
    },
    onSuccess: (session) => {
      // Seeds the entry `useMe` reads, so the landing screen does not refetch
      // what this just verified.
      queryClient.setQueryData(authKeys.session(), session);
    },
    // Every failure below already owns a full screen on the callback. A toast
    // on top of it would be noise, and §5's deny needs a screen, not a toast.
    meta: { suppressErrorToast: true },
  });
};

/**
 * Sign-out is entirely local. §9: "No logout endpoint — since auth is stateless
 * … 'logout' today just means the frontend discards its stored token." There is
 * nothing to await, so this is a plain callback rather than a mutation.
 *
 * `clearAuth` expires the session cookie but deliberately does NOT broadcast —
 * it also runs for a 401, and an expiring token in one tab must not sign out a
 * different person in another. The explicit `broadcastLogout()` below is what
 * kicks sibling tabs on a shared device (FR-AUTH-05).
 */
export const useSignOut = (): (() => void) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return useCallback(() => {
    clearAuth();
    queryClient.clear();
    // Only an explicit sign-out kicks sibling tabs. `clearAuth` alone must not,
    // or one person's token expiring would eject another person mid-shift on a
    // shared plant-floor device (FR-AUTH-05). §9: there is no logout endpoint —
    // signing out is discarding the token locally and telling the other tabs.
    broadcastLogout();
    router.replace(ROUTES.LOGIN);
  }, [clearAuth, queryClient, router]);
};
