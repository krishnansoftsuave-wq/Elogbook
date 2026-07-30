/**
 * `returnTo` is attacker-controlled: it arrives as a query parameter and is fed
 * straight into a navigation. Left unvalidated it is an open redirect, which is
 * why the security standard names it explicitly — a same-origin **path** only,
 * never an absolute URL and never `//host`.
 *
 * A cap keeps a pathological value out of a URL and out of a log line.
 */
export const MAX_RETURN_TO_LENGTH = 512;

/** C0 controls, and DEL. */
const CONTROL_CHARACTER_MAX = 0x1f;
const DELETE_CHARACTER = 0x7f;

/**
 * The URL parser strips tabs and newlines *before* resolving, so a value
 * carrying one arrives here looking like a path and leaves the browser as
 * `//evil.com`. Verified against this environment's WHATWG parser: a tab
 * between the leading slash and the rest is simply dropped.
 *
 * Expressed as a code-point scan rather than a character class so the source
 * stays plain ASCII — a literal control byte in a regex is invisible in review.
 */
const hasStrippedCharacter = (value: string): boolean => {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code <= CONTROL_CHARACTER_MAX || code === DELETE_CHARACTER) return true;
  }
  return false;
};

/**
 * A scheme sits before the first slash: `javascript:alert(1)`, `data:text/html`
 * and `https://evil.com` all carry a colon there, a path never does.
 */
const hasSchemePrefix = (value: string): boolean => {
  const colon = value.indexOf(":");
  if (colon === -1) return false;
  const slash = value.indexOf("/");
  return slash === -1 || colon < slash;
};

const isSameOriginPath = (value: string): boolean => {
  if (value.length === 0 || value.length > MAX_RETURN_TO_LENGTH) return false;
  if (hasStrippedCharacter(value)) return false;
  if (hasSchemePrefix(value)) return false;
  if (!value.startsWith("/")) return false;
  // `//host` is protocol-relative, and a backslash is not a path separator to
  // the URL parser: `new URL("/\\evil.com", origin)` resolves to
  // `http://evil.com/`. The guard this replaces checked only `//`, so `/\host`
  // walked straight through it.
  return value[1] !== "/" && value[1] !== "\\";
};

/**
 * Returns the value when it is a safe same-origin path, otherwise `null` so the
 * caller falls back to a known destination.
 *
 * The value is re-checked after one `decodeURIComponent` because a percent
 * encoded separator survives the first pass: `/%2f%2fevil.com` looks like a
 * path but decodes to `///evil.com`, which resolves off-origin (verified —
 * three slashes behave like two). One decode is enough: whatever consumes the
 * result decodes at most once more.
 */
export const safeReturnTo = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  if (!isSameOriginPath(value)) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // Malformed percent-encoding — `decodeURIComponent("%E0%A4%A")` throws.
    return null;
  }

  if (!isSameOriginPath(decoded)) return null;

  return value;
};
