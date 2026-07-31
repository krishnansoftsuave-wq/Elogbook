/**
 * "Said Al-Busaidi" → "SA". A one-word name falls back to its first two
 * characters.
 *
 * Used for the avatar chip on comment threads, which is decorative — every
 * caller renders it `aria-hidden` beside the author's full name, so this never
 * has to be a *correct* abbreviation of a name in any script, only a stable one.
 * That matters under NFR-07: initials are a Latin-script convention, and taking
 * the first character of an Arabic name produces something a reader would not
 * recognise. Because the real name is always beside it, nothing is lost.
 *
 * Promoted from `features/actions/components/ActionComments.tsx` when the
 * summary thread became the second caller.
 */
export const initialsOf = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};
