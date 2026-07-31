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
 * **It is now the first stop, not the second.** `/auth/mock-adfs` — an invented
 * "Choose an account" screen — used to sit in front of it; the sign-in button
 * redirects straight here with the default account, and `DevRoleSwitcher` in the
 * sidebar footer sends people back through with a different `account` to switch
 * identity. Both are the same one-line change at cutover.
 *
 * Gated to non-production because it calls `POST /dev/token`, which §4 says
 * "will 404 the moment real AD FS is wired in". `NODE_ENV` is a build-time
 * literal, so the branch folds away.
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
