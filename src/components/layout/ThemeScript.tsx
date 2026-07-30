import { SETTINGS_STORAGE_KEY } from "@/store/settingsStore";

/**
 * Applies the persisted theme before first paint. Without this the page renders
 * light, then flips once the settings store rehydrates.
 */
const script = `
(function () {
  try {
    var raw = localStorage.getItem('${SETTINGS_STORAGE_KEY}');
    var theme = raw ? JSON.parse(raw).state.theme : 'system';
    var dark = theme === 'dark' || (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();
`;

export const ThemeScript = () => (
  <script dangerouslySetInnerHTML={{ __html: script }} />
);
