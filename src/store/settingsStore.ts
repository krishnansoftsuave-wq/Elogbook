import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

export interface ImpersonationTarget {
  id: string;
  name: string;
}

export interface SettingsState {
  theme: Theme;
  sidebarCollapsed: boolean;
  /** Set when an admin is acting on behalf of another user. */
  impersonating: ImpersonationTarget | null;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  startImpersonation: (target: ImpersonationTarget) => void;
  stopImpersonation: () => void;
}

export const SETTINGS_STORAGE_KEY = "elogbook-settings";

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "system",
      sidebarCollapsed: false,
      impersonating: null,

      setTheme: (theme) => set({ theme }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      startImpersonation: (impersonating) => set({ impersonating }),
      stopImpersonation: () => set({ impersonating: null }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
