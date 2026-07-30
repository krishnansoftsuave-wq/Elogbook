"use client";

import { useEffect } from "react";

import { useSettingsStore } from "@/store/settingsStore";

/**
 * Mirrors the persisted theme preference onto `<html class="dark">`, which is
 * what the CSS custom properties in globals.css key off.
 */
export const useThemeSync = (): void => {
  const theme = useSettingsStore((state) => state.theme);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      const isDark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.classList.toggle("dark", isDark);
    };

    apply();
    if (theme === "system") media.addEventListener("change", apply);

    return () => media.removeEventListener("change", apply);
  }, [theme]);
};
