"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, FlaskConical, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROLE_LABEL } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { AuthSplitScreen } from "@/features/auth/components/AuthScreen";
import { rolesForGroups } from "@/lib/auth/permissions";
import { MOCK_ACCOUNTS } from "@/mocks/auth/directory";

/**
 * INVENTED SCREEN — it appears in neither the BRD nor the prototype.
 *
 * It exists because the redirect chain has to have a middle: real AD FS shows
 * an organisation sign-in page between the app and the callback, and building
 * that shape now means cutover is "change where the sign-in button points",
 * rather than "invent a callback". It is labelled as scaffolding on purpose;
 * nothing here should ever be mistaken for a designed Oman LNG screen, which is
 * also why it keeps the flask banner instead of leaning on the brand.
 *
 * It is dev-only twice over: the route calls `notFound()` in a production
 * build, and the `/dev/token` endpoint it leads to 404s there as well.
 */

/** Roles are display-only here; `ROLE_LABEL[r] ?? r` keeps a custom role safe. */
const roleSummary = (groups: readonly string[]): string => {
  const roles = rolesForGroups(groups);
  if (roles.length === 0) return "No platform role";
  return roles.map((role) => ROLE_LABEL[role] ?? role).join(" + ");
};

interface MockAdfsAccountPickerProps {
  /** Already validated by `safeReturnTo` on the server. */
  returnTo?: string;
}

export const MockAdfsAccountPicker = ({
  returnTo,
}: MockAdfsAccountPickerProps) => {
  const router = useRouter();
  const [pendingAccount, setPendingAccount] = useState<string | null>(null);

  const handleSelect = (username: string) => {
    setPendingAccount(username);
    const params = new URLSearchParams({ account: username });
    if (returnTo) params.set("returnTo", returnTo);
    // CUTOVER: AD FS redirects the browser here itself, with `code` and `state`
    // instead of `account`. `/auth/callback` is already sitting at that URL.
    router.push(`${ROUTES.CALLBACK}?${params.toString()}`);
  };

  return (
    <AuthSplitScreen contentClassName="max-w-[28rem]">
      <div className="flex flex-col gap-5">
        {/* The red framing stays, the body text does not: 12px
            `text-destructive` on this `bg-destructive/10` tint measures 3.86:1
            in light theme, below the 4.5:1 AA minimum. `text-foreground` reads
            16.03:1 on the same tint, and the icon keeps the destructive colour
            at 3.86:1, which clears the 3:1 non-text bar. Local, so no other
            `destructive` surface moves. */}
        <p
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs font-medium text-foreground"
          role="note"
        >
          <FlaskConical
            className="size-4 shrink-0 text-destructive"
            aria-hidden
          />
          Development mock — not a real Oman LNG sign-in page. Choose an account
          to stand in for an AD FS login.
        </p>

        <div className="flex flex-col gap-1">
          <h1 className="text-[1.625rem] font-bold">Choose an account</h1>
          <p className="text-[0.90625rem] leading-relaxed text-muted-foreground">
            AD group membership is the whole identity here. There are no
            passwords.
          </p>
        </div>

        <ul className="flex flex-col gap-2">
          {MOCK_ACCOUNTS.map((account) => {
            const isPending = pendingAccount === account.username;

            return (
              <li key={account.username}>
                {/* `focusableWhenDisabled` on the chosen one only: it is the
                    element holding focus, and a native `disabled` would drop
                    that focus to `<body>` before the navigation lands. The rest
                    are genuinely unavailable, so they keep the native attribute
                    and the dimming that comes with it. */}
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto w-full justify-start gap-3 bg-card px-4 py-3 text-start"
                  disabled={pendingAccount !== null}
                  focusableWhenDisabled={isPending}
                  aria-busy={isPending}
                  onClick={() => handleSelect(account.username)}
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">
                      {account.displayName}
                    </span>
                    <span className="truncate text-xs font-normal text-muted-foreground">
                      {account.username} · {roleSummary(account.groups)}
                    </span>
                  </span>

                  {isPending ? (
                    <Loader2
                      className="size-4 shrink-0 animate-spin"
                      aria-hidden
                    />
                  ) : (
                    // Mirrors with `dir`: a chevron pointing to the inline end
                    // must point the other way in Arabic (NFR-07).
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100"
                      aria-hidden
                    />
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      </div>
    </AuthSplitScreen>
  );
};
