import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CallbackExchange } from "@/features/auth/components/CallbackExchange";
import { safeReturnTo } from "@/lib/auth/returnTo";

export const metadata: Metadata = { title: "Signing in" };

interface CallbackPageProps {
  searchParams: Promise<{
    account?: string | string[];
    returnTo?: string | string[];
  }>;
}

/**
 * Where the sign-in redirect chain lands. At cutover this is the AD FS reply
 * URL and `account` becomes `code` + `state`; the route itself does not move,
 * which is the point of giving the mock a redirect shape.
 *
 * Gated to non-production for the same reason as `/auth/mock-adfs`: today it
 * calls `POST /dev/token`, which §4 says "will 404 the moment real AD FS is
 * wired in". `NODE_ENV` is a build-time literal, so the branch folds away.
 */
export default async function CallbackPage({
  searchParams,
}: CallbackPageProps) {
  if (process.env.NODE_ENV === "production") notFound();

  const { account, returnTo } = await searchParams;

  return (
    <CallbackExchange
      account={typeof account === "string" ? account : undefined}
      returnTo={safeReturnTo(returnTo) ?? undefined}
    />
  );
}
