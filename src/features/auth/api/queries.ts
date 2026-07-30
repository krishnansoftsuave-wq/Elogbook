"use client";

import { useQuery } from "@tanstack/react-query";

import { API_ENDPOINTS } from "@/constants/api";
import { authKeys } from "@/features/auth/api/keys";
import { meResponseSchema, toSessionUser } from "@/features/auth/schemas";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/store/authStore";

/**
 * `GET /me` — §5's "single source of truth for driving role-based UI". The
 * store holds the token; this holds the user, their roles and the permission
 * union every gate reads.
 *
 * The `staleTime` is the frontend's only contribution to FR-AUTH-04: a role
 * changed backend-side surfaces on the next refetch rather than needing a
 * re-login. Propagating an AD leaver is a [BACKEND] concern — this does not
 * satisfy FR-AUTH-04.
 */
export const useMe = () => {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: authKeys.session(),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.AUTH.ME);
      return toSessionUser(meResponseSchema.parse(response.data).data);
    },
    enabled: Boolean(token),
    // Matches the app's ~1-minute refresh cadence (NFR-03: no chatty polling).
    staleTime: 60_000,
    // A 401 here already ended the session in the interceptor; retrying would
    // fire a second, definitionally unauthenticated request.
    retry: false,
    // The interceptor owns the 401. A toast on top of it would be noise, and
    // the §5 deny needs a screen, not a toast.
    meta: { suppressErrorToast: true },
  });
};
