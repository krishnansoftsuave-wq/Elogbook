/**
 * One non-secret cookie, written so the edge proxy can make a best-effort
 * routing decision before any JS runs (AGENTS.md §3, layer 1 of 3).
 *
 * It carries the value `1` and nothing else. It is deliberately NOT the token
 * and NOT the role: this cookie is written by client JS, so anyone can forge
 * it, and the worst a forged marker achieves is passage through the edge check
 * into `RoleGuard` — layer 2, the authoritative one — which bounces them. A
 * cookie that carried privilege would instead hand an attacker that privilege.
 */
export const SESSION_COOKIE = "elogbook_session";
export const SESSION_COOKIE_VALUE = "1";

/**
 * Written by the auth scaffold this replaces. `elogbook_role` was read by
 * `proxy.ts` to decide where to send a request, which made a client-writable
 * string a privilege decision; `elogbook_token` put a live bearer token in a
 * cookie. Both are expired on every sign-out so a returning browser cannot keep
 * a stale one from a previous build.
 */
export const LEGACY_AUTH_COOKIES: readonly string[] = [
  "elogbook_token",
  "elogbook_role",
];

interface CookieOptions {
  /** Omit for a session cookie — one that dies with the browser session. */
  maxAge?: number;
  secure: boolean;
}

/** Pure so the attribute string is assertable without a document. */
export const serializeCookie = (
  name: string,
  value: string,
  { maxAge, secure }: CookieOptions
): string =>
  [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    ...(maxAge === undefined ? [] : [`Max-Age=${maxAge}`]),
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");

const isBrowser = (): boolean => typeof document !== "undefined";

const isSecureContext = (): boolean => window.location.protocol === "https:";

export const writeSessionCookie = (): void => {
  if (!isBrowser()) return;
  document.cookie = serializeCookie(SESSION_COOKIE, SESSION_COOKIE_VALUE, {
    secure: isSecureContext(),
  });
};

/** Expires the marker and every cookie the previous auth scaffold wrote. */
export const clearSessionCookie = (): void => {
  if (!isBrowser()) return;
  const secure = isSecureContext();
  for (const name of [SESSION_COOKIE, ...LEGACY_AUTH_COOKIES]) {
    document.cookie = serializeCookie(name, "", { maxAge: 0, secure });
  }
};
