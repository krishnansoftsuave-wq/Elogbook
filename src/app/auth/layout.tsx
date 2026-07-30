import type { ReactNode } from "react";

/**
 * Deliberately a passthrough.
 *
 * The shell used to live here, which forced one shape on all four sign-in
 * screens. The prototype has two — the split brand panel (`app-source.txt`
 * 2271–2285) and the teal-bar signing-in screen (2259–2268) — and
 * `/auth/callback` alone needs both: the bar while it exchanges a token, the
 * split when that exchange is refused. A segment layout wraps every child
 * identically and cannot switch on state, so both shells moved into
 * `features/auth/components/AuthScreen.tsx` and each screen names its own.
 *
 * Kept rather than deleted, so the reasoning sits where someone would otherwise
 * reintroduce the shell.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
