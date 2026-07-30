"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { AuthSplitScreen } from "@/features/auth/components/AuthScreen";

interface SignInPanelProps {
  /**
   * Already validated by `safeReturnTo` on the server — the page drops a
   * hostile value before this component ever sees it, so this is a path.
   */
  returnTo?: string;
}

/**
 * The prototype's login screen (`app-source.txt` 2278–2285): a lock badge,
 * "Welcome", one sentence, and a single SSO button, centred in the right-hand
 * column of the split.
 *
 * There is no email or password field. The prototype's `loginField` helper
 * (2244) is dead code that `loginScreen` never calls, and §1 of
 * `authentication_flow.md` is explicit that the backend "never stores passwords
 * and never authenticates a username/password itself" — it only ever validates
 * a signed token.
 *
 * The prototype's 1700 ms fake timeout (2241) is replaced by a real navigation:
 * the pending state lasts exactly as long as the route transition does.
 */
export const SignInPanel = ({ returnTo }: SignInPanelProps) => {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleSignIn = () => {
    setIsRedirecting(true);
    // CUTOVER (tracker A-01): this line becomes
    // `window.location.assign(<AD FS authorize URL>)` with `returnTo` carried
    // in the OAuth `state` parameter. Everything downstream — /auth/callback,
    // the token exchange, GET /me, the permission-derived landing — is
    // unchanged, which is the whole reason the mock takes a redirect shape
    // instead of posting to /dev/token from this button.
    router.push(
      returnTo
        ? `${ROUTES.MOCK_ADFS}?returnTo=${encodeURIComponent(returnTo)}`
        : ROUTES.MOCK_ADFS
    );
  };

  return (
    <AuthSplitScreen>
      <div className="flex flex-col items-center text-center">
        {/* Prototype: a 56px `C.active` disc holding a 28px teal
            `lock_person`. `text-primary` on `--brand-subtle` measures 3.89:1,
            clearing the 3:1 bar for a non-text graphic (WCAG 1.4.11). */}
        <span className="mb-5.5 flex size-14 items-center justify-center rounded-full bg-brand-subtle text-primary">
          <LockKeyhole className="size-7" aria-hidden />
        </span>

        <h1 className="text-[1.625rem] font-bold">Welcome</h1>

        <p className="mt-2 mb-8 text-[0.90625rem] leading-relaxed text-muted-foreground">
          Continue to the AI E-Logbook Platform with your organisation account.
        </p>

        {/* `focusableWhenDisabled`: Base UI then reports the busy state as
            `aria-disabled` and swallows the click itself, instead of setting the
            native `disabled` on the element that currently holds focus. A native
            `disabled` drops focus to `<body>` mid-navigation, so nothing
            announces the label turning into "Opening Oman LNG sign-in…". */}
        <Button
          type="button"
          size="lg"
          className="h-12 w-full text-[0.9375rem]"
          disabled={isRedirecting}
          focusableWhenDisabled
          aria-busy={isRedirecting}
          onClick={handleSignIn}
        >
          {isRedirecting ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            // `LogIn` points into a door on its right edge, so it has to mirror
            // with `dir` (NFR-07). The spinner above is radial and must not.
            <LogIn className="size-5 rtl:-scale-x-100" aria-hidden />
          )}
          {isRedirecting
            ? "Opening Oman LNG sign-in…"
            : "Sign in with Oman LNG Account"}
        </Button>
      </div>
    </AuthSplitScreen>
  );
};
