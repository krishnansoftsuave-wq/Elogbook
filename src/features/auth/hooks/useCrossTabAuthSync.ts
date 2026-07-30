"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { ROUTES } from "@/constants/routes";
import { LOGOUT_EPOCH_KEY } from "@/lib/auth/tokenStorage";
import { useAuthStore } from "@/store/authStore";

/**
 * Ends this tab's session when someone signs out in another one.
 *
 * The session itself is tab-scoped — it lives in sessionStorage, which fires no
 * cross-tab `storage` event — so there is no session state to mirror between
 * tabs, and the old user-id comparison it replaces has nothing left to compare.
 * What a shared plant-floor device still needs (FR-AUTH-05) is that walking
 * away and signing out clears every tab, so exactly one localStorage key
 * carries a logout timestamp and this listens for it.
 *
 * `clearAuth` never broadcasts — only `useSignOut` does — so a tab reacting
 * here cannot bounce the epoch back at the tab that wrote it.
 */
export const useCrossTabAuthSync = (): void => {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      // A null `newValue` means the key was removed or storage was cleared —
      // not a sign-out.
      if (event.key !== LOGOUT_EPOCH_KEY || event.newValue === null) return;

      useAuthStore.getState().clearAuth();
      queryClient.clear();

      if (window.location.pathname.startsWith(ROUTES.LOGIN)) return;
      router.replace(ROUTES.LOGIN);
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [queryClient, router]);
};
