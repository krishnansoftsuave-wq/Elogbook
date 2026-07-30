import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  clearSessionCookie,
  writeSessionCookie,
} from "@/lib/auth/sessionCookie";
import { sessionTokenStorage } from "@/lib/auth/tokenStorage";

/**
 * The bearer token and nothing else.
 *
 * `GET /me` — the user, their roles, their permissions, their area scope — is
 * server data, so TanStack Query owns it under `authKeys.session()` and this
 * store never sees it (AGENTS.md, "The Golden Rule"). Copying it here would
 * create the second source of truth that produces stale-sync bugs: a role
 * changed backend-side would refetch into Query and leave a stale copy here
 * driving the gates.
 */
export interface AuthState {
  token: string | null;
  /**
   * Epoch milliseconds, derived from §4's `expires_in` (900s today). Nothing
   * acts on it yet — an expired token is discovered by the first `401`, which
   * ends the session. It is stored because it is the only session ceiling the
   * app has: §9 confirms there is no refresh endpoint to extend one.
   */
  expiresAt: number | null;
  /** False until zustand/persist has rehydrated from sessionStorage. */
  hasHydrated: boolean;
  setSession: (token: string, expiresIn: number) => void;
  clearAuth: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const AUTH_STORAGE_KEY = "elogbook-auth";

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      expiresAt: null,
      hasHydrated: false,

      setSession: (token, expiresIn) => {
        writeSessionCookie();
        set({ token, expiresAt: Date.now() + expiresIn * 1000 });
      },

      clearAuth: () => {
        // Deliberately does NOT broadcast. Sessions are tab-scoped, so this
        // runs for a 401 too — and an expiring token in one tab must not sign
        // out a different person working in another. That is precisely the
        // shared-device case FR-AUTH-05 asks us to support. Only an explicit
        // sign-out broadcasts; see `useSignOut`.
        clearSessionCookie();
        set({ token: null, expiresAt: null });
      },

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => sessionTokenStorage),
      partialize: (state) => ({
        token: state.token,
        expiresAt: state.expiresAt,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
