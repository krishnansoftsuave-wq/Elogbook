import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Role } from "@/constants/roles";
import type { SubCategory } from "@/constants/subCategories";
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
/**
 * Which role the shell is being *viewed as*, when an administrator is
 * impersonating one.
 *
 * This is the one piece of role information that legitimately lives here rather
 * than in Query, and AGENTS.md's ownership table says so explicitly
 * ("impersonation | Zustand"). It is not a copy of `GET /me`: it is a UI choice
 * the user made, which no endpoint knows about and no refetch can restore.
 *
 * ⚠️ **It changes the view, not the entitlement.** The bearer token is
 * untouched, so an administrator impersonating a Supervisor still carries
 * administrator rights at the API. That is FR-ADM-03 working as designed — the
 * route guard and the API are the access control, never the rendered menu — but
 * it makes impersonation a *preview* rather than a sandbox, and the UI says so.
 */
export interface Impersonation {
  role: Role;
  subCategory: SubCategory;
}

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
  /** `null` when the session is being viewed as itself. */
  impersonation: Impersonation | null;
  setSession: (token: string, expiresIn: number) => void;
  setImpersonation: (impersonation: Impersonation) => void;
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
      impersonation: null,

      setSession: (token, expiresIn) => {
        writeSessionCookie();
        // A new session is a new person: whoever the last one was pretending to
        // be must not survive into it.
        set({
          token,
          expiresAt: Date.now() + expiresIn * 1000,
          impersonation: null,
        });
      },

      setImpersonation: (impersonation) => set({ impersonation }),

      clearAuth: () => {
        // Deliberately does NOT broadcast. Sessions are tab-scoped, so this
        // runs for a 401 too — and an expiring token in one tab must not sign
        // out a different person working in another. That is precisely the
        // shared-device case FR-AUTH-05 asks us to support. Only an explicit
        // sign-out broadcasts; see `useSignOut`.
        clearSessionCookie();
        set({ token: null, expiresAt: null, impersonation: null });
      },

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => sessionTokenStorage),
      partialize: (state) => ({
        token: state.token,
        expiresAt: state.expiresAt,
        // Persisted so a reload does not silently drop you back into your own
        // role mid-demonstration. Tab-scoped, like the token it accompanies.
        impersonation: state.impersonation,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
