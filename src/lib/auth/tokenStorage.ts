import type { StateStorage } from "zustand/middleware";

/**
 * The two storage surfaces auth is allowed to touch, and nothing else.
 *
 * `authentication_flow.md` §4 is explicit: the access token is "a bearer token
 * good for 15 minutes … not a long-lived localStorage secret to keep forever".
 * So the token lives in memory (the zustand store) mirrored into
 * **sessionStorage**, which survives an in-tab refresh and dies with the tab.
 * Tab-scoped sessions are also what makes FR-AUTH-05 fast user switching work
 * on a shared plant-floor device — a second tab is a second identity.
 *
 * localStorage holds exactly one value: a logout timestamp. No token, no user
 * data, ever.
 */

const isBrowser = (): boolean => typeof window !== "undefined";

/**
 * SSR-safe adapter for `zustand/persist`. Every method no-ops on the server,
 * and swallows the `SecurityError` a browser with storage disabled throws —
 * a plant-floor tablet in a locked-down profile must degrade to "signed out",
 * not crash on import.
 */
export const sessionTokenStorage: StateStorage = {
  getItem: (name) => {
    if (!isBrowser()) return null;
    try {
      return window.sessionStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    if (!isBrowser()) return;
    try {
      window.sessionStorage.setItem(name, value);
    } catch {
      // Nothing to do — the in-memory store is still authoritative this tab.
    }
  },
  removeItem: (name) => {
    if (!isBrowser()) return;
    try {
      window.sessionStorage.removeItem(name);
    } catch {
      // As above: the session has already ended in memory.
    }
  },
};

/**
 * The cross-tab logout channel. sessionStorage fires no `storage` event in
 * sibling tabs, so a tab-scoped session cannot broadcast through it; this one
 * localStorage key carries a timestamp and nothing else, which is enough to
 * tell every other tab "someone signed out on this device".
 */
export const LOGOUT_EPOCH_KEY = "elogbook-logout-epoch";

export const broadcastLogout = (): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(LOGOUT_EPOCH_KEY, String(Date.now()));
  } catch {
    // Sibling tabs keep their own session; each still ends on its own 401.
  }
};
