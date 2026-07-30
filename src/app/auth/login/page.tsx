import type { Metadata } from "next";

import { SignInPanel } from "@/features/auth/components/SignInPanel";
import { safeReturnTo } from "@/lib/auth/returnTo";

export const metadata: Metadata = { title: "Sign in" };

interface LoginPageProps {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}

/**
 * A server component so `returnTo` is validated before it reaches the browser
 * at all. Reading it here rather than with `useSearchParams` also keeps the
 * sign-in surface off the Suspense-boundary requirement that hook carries.
 *
 * The local `safeReturnTo` this page used to define accepted `/\evil.com` —
 * it checked `//` but not `/\`, and the URL parser resolves the latter
 * off-origin just the same. It now uses the one shared implementation in
 * `@/lib/auth/returnTo`, which the proxy, the guard and the interceptor also
 * call.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { returnTo } = await searchParams;

  return <SignInPanel returnTo={safeReturnTo(returnTo) ?? undefined} />;
}
