import Link from "next/link";
import { ShieldX } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { AuthSplitScreen } from "@/features/auth/components/AuthScreen";

/**
 * `authentication_flow.md` §5, verbatim. The contract asks for "a clear 'access
 * denied — contact an administrator' screen, not a generic error", so the exact
 * wording is part of the contract and this constant is where it lives.
 *
 * Duplicated from the mock's `UNMAPPED_ACCOUNT_MESSAGE` on purpose: the mock is
 * deleted at cutover (README, "Cutover") and no shipped screen may import from
 * `src/mocks/`. Both transcribe the same source paragraph.
 */
export const ACCESS_DENIED_MESSAGE =
  "Access denied: your AD account is not mapped to any platform role. Contact an administrator to request access.";

interface AccessDeniedPanelProps {
  /**
   * The server's own message, shown underneath when it says something the
   * verbatim text does not. Untrusted network content — rendered as React text,
   * never as markup (NFR-06).
   */
  detail?: string;
}

/**
 * The §5 deny (BE-US001-5): a validly-tokened account whose AD groups map to no
 * platform role is refused outright rather than admitted with zero permissions.
 *
 * Reachable without a session, deliberately — it is `homeForSession`'s fallback
 * for a session that can enter nowhere, so putting it behind the guard would
 * make it a redirect loop instead of an answer.
 *
 * It renders the split shell itself, which is what lets `CallbackExchange` swap
 * it in for the signing-in screen without the two fighting over a shared
 * layout.
 */
export const AccessDeniedPanel = ({ detail }: AccessDeniedPanelProps) => (
  <AuthSplitScreen>
    {/* `role="alert"` because `CallbackExchange` swaps this in for the "Signing
        in…" status without navigating: without a live region the refusal is
        silent to a screen reader (WCAG 4.1.3). Matches `SignInFailed`, its
        sibling state in that same swap. */}
    <div className="flex flex-col items-center gap-3 text-center" role="alert">
      <span className="mb-2 flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldX className="size-7" aria-hidden />
      </span>

      <h1 className="text-[1.625rem] font-bold">Access denied</h1>

      <p className="text-[0.90625rem] leading-relaxed text-muted-foreground">
        {ACCESS_DENIED_MESSAGE}
      </p>

      {detail && detail !== ACCESS_DENIED_MESSAGE ? (
        // `wrap-anywhere`: the server's message is untrusted text and one
        // unbroken token pushed 98px of horizontal page scroll at 375px.
        <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
          Details from the server: {detail}
        </p>
      ) : null}

      <Link
        href={ROUTES.LOGIN}
        className={`${buttonVariants({ variant: "outline", size: "lg" })} mt-3`}
      >
        Back to sign in
      </Link>
    </div>
  </AuthSplitScreen>
);
