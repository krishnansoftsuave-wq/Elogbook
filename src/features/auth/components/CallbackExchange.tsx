"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { useSignInExchange } from "@/features/auth/api/mutations";
import { AccessDeniedPanel } from "@/features/auth/components/AccessDeniedPanel";
import { AuthSplitScreen } from "@/features/auth/components/AuthScreen";
import { SigningInState } from "@/features/auth/components/SigningInState";
import { getErrorMessage, getStatusCode } from "@/lib/api-error";
import { homeForSession } from "@/lib/auth/access";
import { safeReturnTo } from "@/lib/auth/returnTo";
import { findMockAccount } from "@/mocks/auth/directory";

const UNKNOWN_ACCOUNT_MESSAGE =
  "That sign-in request did not name a known account, so there was nothing to exchange.";

interface SignInFailedProps {
  message: string;
}

const SignInFailed = ({ message }: SignInFailedProps) => (
  <AuthSplitScreen>
    <div className="flex flex-col items-center gap-3 text-center" role="alert">
      <span className="mb-2 flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-7" aria-hidden />
      </span>
      <h1 className="text-[1.625rem] font-bold">
        We couldn&apos;t sign you in
      </h1>
      {/* `wrap-anywhere`, not `break-words`: the server's message is untrusted
          text and one unbroken token pushed 138px of horizontal page scroll at
          375px. `overflow-wrap: anywhere` is the variant that also shrinks the
          min-content width, which is what the flex ancestors size against. */}
      <p className="text-[0.90625rem] leading-relaxed wrap-anywhere text-muted-foreground">
        {message}
      </p>
      <Link
        href={ROUTES.LOGIN}
        className={`${buttonVariants({ variant: "outline", size: "lg" })} mt-3`}
      >
        Back to sign in
      </Link>
    </div>
  </AuthSplitScreen>
);

interface CallbackExchangeProps {
  /** The mock's stand-in for AD FS's `code`. */
  account?: string;
  /** Already validated by `safeReturnTo` on the server; re-validated here. */
  returnTo?: string;
}

/**
 * Where the sign-in chain lands and where the session is actually created.
 *
 * CUTOVER (tracker A-01): real AD FS redirects the browser to this exact URL
 * carrying `code` and `state` instead of `account`. Only the `/dev/token` call
 * inside `useSignInExchange` changes — the `GET /me` verification, the
 * permission derived landing and every state below stay as they are.
 *
 * The 401 is handled here rather than by the axios interceptor on purpose. §3
 * gives an expired token and §5's unmapped-account deny the same `401
 * unauthorized` and the wire carries no discriminator, so `endSession` skips its
 * bounce for anything under `/auth` and leaves this screen mounted to own the
 * message. Navigating away would replace "you are not mapped to a role" with a
 * login form and the user would never learn why they were refused.
 *
 * Both network calls live in one mutation rather than a mutation plus a `useMe`
 * query, because `endSession` clears the query cache on that 401 and a
 * destroyed query cancels silently instead of erroring — see `useSignInExchange`.
 */
export const CallbackExchange = ({
  account,
  returnTo,
}: CallbackExchangeProps) => {
  const router = useRouter();
  const exchange = useSignInExchange();

  const mockAccount = account ? findMockAccount(account) : undefined;
  const { mutate } = exchange;

  useEffect(() => {
    if (!mockAccount) return;

    // A one-shot side effect on arrival — the OAuth code exchange — not data
    // fetching, so there is no query to hang it on.
    //
    // Scheduled rather than called inline, and cancelled on teardown, because
    // React runs this effect twice: once in a pass it immediately discards
    // (`reactStrictMode: true` in development, and again on a client
    // transition). A mutation started in the discarded pass still reaches the
    // network but its terminal state never reaches this component — verified
    // against the running app, where the request 422'd and the screen sat on
    // "Signing in…" forever. Deferring by a task lets the discarded pass
    // cancel its own claim, so exactly one exchange runs and the surviving
    // render owns its result. A ref guard cannot do this: the ref survives the
    // discarded pass, so the orphaned request is the only one there is.
    const scheduled = setTimeout(() => {
      mutate({
        username: mockAccount.username,
        groups: [...mockAccount.groups],
        display_name: mockAccount.displayName,
      });
    });

    return () => clearTimeout(scheduled);
  }, [mockAccount, mutate]);

  const session = exchange.data;

  useEffect(() => {
    if (!session) return;
    // Validated a second time: the value crossed a URL to get here, and the
    // cost of re-checking a string is nothing next to an open redirect.
    router.replace(
      safeReturnTo(returnTo) ?? homeForSession(session.permissions)
    );
  }, [returnTo, router, session]);

  if (!mockAccount) return <SignInFailed message={UNKNOWN_ACCOUNT_MESSAGE} />;

  // §5's deny, in the two shapes it can arrive in. `GET /me` answering 401 is
  // the cutover-stable one. The 422 is stub-mode only: §4 rejects an AD group
  // that maps to no role *before* minting, so the same condition surfaces one
  // step earlier here than it will against real AD FS. This request's body is
  // built from a directory entry rather than from user input, so an unknown
  // group is its only 422 branch.
  const status = getStatusCode(exchange.error);
  if (status === 401 || status === 422) {
    return <AccessDeniedPanel detail={getErrorMessage(exchange.error)} />;
  }

  if (exchange.isError) {
    return <SignInFailed message={getErrorMessage(exchange.error)} />;
  }

  if (session) {
    return (
      <SigningInState
        title="Signed in"
        detail="Taking you to your workspace…"
      />
    );
  }

  return <SigningInState />;
};
