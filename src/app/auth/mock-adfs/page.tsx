import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MockAdfsAccountPicker } from "@/features/auth/components/MockAdfsAccountPicker";
import { safeReturnTo } from "@/lib/auth/returnTo";

export const metadata: Metadata = { title: "Development sign-in" };

interface MockAdfsPageProps {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}

/**
 * The dev-only stand-in for the AD FS sign-in page (tracker A-01).
 *
 * `process.env.NODE_ENV` is replaced with a string literal at build time, so in
 * a production build this reads `"production" === "production"` and the route
 * can only ever 404. A `NEXT_PUBLIC_*` flag was considered and rejected: it
 * ships to the browser and could be flipped on against a production build,
 * which is a weaker guarantee, not a stronger one.
 */
export default async function MockAdfsPage({
  searchParams,
}: MockAdfsPageProps) {
  if (process.env.NODE_ENV === "production") notFound();

  const { returnTo } = await searchParams;

  return (
    <MockAdfsAccountPicker returnTo={safeReturnTo(returnTo) ?? undefined} />
  );
}
