import type { ReactNode } from "react";

import { BrandMark } from "@/components/layout/BrandMark";
import { BRAND_NAME } from "@/constants/brand";
import { cn } from "@/lib/utils";

/**
 * The sign-in surface has exactly two shapes in the prototype, and this file is
 * both of them.
 *
 * They are components rather than a Next.js layout because they are not
 * interchangeable per route — `/auth/callback` renders the bar shape while it
 * is exchanging a token and the split shape when that exchange fails. A segment
 * layout wraps every child alike and could not do that. `/auth/layout.tsx` is
 * therefore a passthrough, and each screen names the shell it belongs in.
 *
 * Sizes are transcribed from the prototype but expressed in rem, so the whole
 * surface scales with a user's browser text setting (WCAG 1.4.4). The
 * prototype's px would pin it.
 */

const BRAND_TAGLINE =
  "Sign in with your Oman LNG account to access the platform.";

interface AuthScreenProps {
  children: ReactNode;
  /**
   * Widens the content column past the prototype's 380px. Only the mock AD FS
   * picker uses it — a list of accounts needs more room than a single button,
   * and that screen is not in the prototype to be faithful to.
   */
  contentClassName?: string;
}

/**
 * The prototype's login layout (`app-source.txt` 2271–2285): a gradient brand
 * panel at 42% width beside a centred content column on `#F3F6F5`.
 *
 * Responsive is this repo's problem, not the prototype's — it is authored at
 * 1440×900 only (`SCREENS.md`, "Gaps") while the engagement requires 375 / 768
 * / 1440 (NFR-08). Below `lg` the 42% panel would leave too little for the
 * form, so it is replaced by a compact gradient bar carrying the same mark and
 * name. Branding survives the breakpoint instead of disappearing at it.
 */
export const AuthSplitScreen = ({
  children,
  contentClassName,
}: AuthScreenProps) => (
  <div className="flex flex-1 flex-col bg-auth-surface lg:flex-row lg:items-stretch">
    {/* Below `lg` only. `aria-hidden` because the panel below states the same
        two strings, and one of the two is always in the tree. */}
    <div
      aria-hidden
      className="flex shrink-0 items-center gap-3 bg-[image:var(--brand-gradient)] px-5 py-4 text-on-brand lg:hidden"
    >
      <BrandMark size="sm" onBrand />
      <p className="text-sm font-semibold">{BRAND_NAME}</p>
    </div>

    {/* `justify-end`: the prototype anchors the lockup to the bottom of the
        panel, which is also where the gradient is darkest — the tagline's
        #BFE6E0 measures 5.36:1 there and only 2.65:1 at the top. */}
    <aside className="hidden w-[42%] max-w-[35rem] shrink-0 flex-col justify-end bg-[image:var(--brand-gradient)] px-15 py-16 text-on-brand lg:flex">
      <BrandMark size="lg" onBrand className="mb-6" />
      {/* A `<p>`, not a heading: each screen owns the page's single `<h1>`. */}
      <p className="text-[1.875rem] leading-tight font-bold">{BRAND_NAME}</p>
      <p className="mt-4 max-w-[23.75rem] text-[0.9375rem] leading-relaxed text-on-brand-muted">
        {BRAND_TAGLINE}
      </p>
    </aside>

    {/* A `<main>` so the screen's content sits in a landmark — the brand
        `<aside>` would otherwise be the only one on the page, leaving the form
        outside any region (axe `landmark-one-main`). */}
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-10 lg:px-16">
      <div className={cn("w-full max-w-[23.75rem]", contentClassName)}>
        {children}
      </div>
    </main>
  </div>
);

/**
 * The prototype's signing-in layout (`app-source.txt` 2259–2268): a 54px teal
 * bar above a centred column on white.
 *
 * It is a different shape from the split above on purpose — it is what the
 * prototype shows once the sign-in button has been pressed, and it is a
 * deliberate rehearsal of the application top bar the user is about to land on.
 */
export const AuthBarScreen = ({ children }: AuthScreenProps) => (
  <div className="flex flex-1 flex-col bg-card">
    <div className="flex h-[3.375rem] shrink-0 items-center gap-3 bg-brand-surface px-5.5 text-on-brand">
      <BrandMark size="sm" onBrand />
      <p className="text-[0.9375rem] font-semibold">{BRAND_NAME}</p>
    </div>

    <main className="flex flex-1 flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-[23.75rem]">{children}</div>
    </main>
  </div>
);
