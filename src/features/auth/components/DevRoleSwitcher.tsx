"use client";

import { useRouter } from "next/navigation";
import { ChevronUp, FlaskConical } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABEL, roleLabel } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { useSession } from "@/features/auth/hooks/useSession";
import { initialsOf } from "@/lib/initials";
import { rolesForGroups } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { MOCK_ACCOUNTS } from "@/mocks/auth/directory";

/**
 * **DEV-ONLY SCAFFOLDING.** Switch which mock AD account the session belongs to,
 * from the foot of the sidebar — the prototype's `roleControl()` / `roleMenu()`
 * (`app-source.txt` 246–276).
 *
 * ## This is not the product's role switcher, and must not become one
 *
 * `AGENTS.md` and `SCREENS.md` both say a free role switcher is **admin
 * impersonation behind a permission gate**, and the session's role comes from
 * `GET /me`. That still holds and that control is still **unbuilt**. This
 * replaces the invented `/auth/mock-adfs` account picker, which was scaffolding
 * for the same job in a worse place — a gate before sign-in rather than a
 * control after it. Owner decision, 2026-08-01.
 *
 * ## Two independent guards, and neither is a runtime flag
 *
 * `process.env.NODE_ENV` is substituted with a string literal at build time, so
 * the early return below folds to `if (true) return null` in a production
 * bundle. `Sidebar` carries the *same* test at the call site, which is what lets
 * the bundler drop this module entirely rather than ship a component that
 * returns null. A `NEXT_PUBLIC_*` flag was rejected for `/auth/mock-adfs` and is
 * rejected here for the same reason — it ships to the browser and could be
 * flipped on against a production build (`mocks/http.ts:8-11`).
 *
 * ## Switching goes through the callback, not through an inline exchange
 *
 * `router.push('/auth/callback?account=…')` re-runs the real chain:
 * `POST /dev/token` → `GET /me`, with `useSignInExchange` clearing the query
 * cache *before* the new token lands, and `CallbackExchange` routing to
 * `homeForSession(permissions)` so a role that cannot reach the current screen
 * is never bounced off it. **Nothing is copied into Zustand** — `authStore`
 * holds the token and `GET /me` stays the source of truth.
 *
 * Doing the exchange in place would need a second copy of the deny, failure and
 * signing-in screens: `useSignInExchange` sets `meta.suppressErrorToast` because
 * "every failure already owns a full screen on the callback", so an in-place
 * switch to an unmapped account would fail **silently**.
 */

/** Roles are display-only here; `ROLE_LABEL[r] ?? r` keeps a custom role safe. */
const roleSummary = (groups: readonly string[]): string => {
  const roles = rolesForGroups(groups);
  if (roles.length === 0) return "No platform role";
  return roles.map((role) => ROLE_LABEL[role] ?? role).join(" + ");
};

interface DevRoleSwitcherProps {
  /** The rail is 4rem wide when collapsed — no room for the label. */
  collapsed: boolean;
}

export const DevRoleSwitcher = ({ collapsed }: DevRoleSwitcherProps) => {
  const router = useRouter();
  const { session } = useSession();

  // Folds to a constant in a production build; `Sidebar` repeats the test so
  // this module can be shaken out rather than shipped as a no-op.
  if (process.env.NODE_ENV === "production") return null;
  if (!session) return null;

  const current = session.username;
  const currentRoles = session.roles.map(roleLabel).join(" · ");

  return (
    <div className="-mx-3 mt-auto border-t border-sidebar-border px-3 pt-3">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className={cn(
                "group/dev-role h-auto w-full gap-2.5 bg-sidebar-accent/40 py-2 text-start",
                collapsed ? "justify-center px-0" : "justify-start px-2.5"
              )}
              /*
                The whole state in the accessible name, because when the rail is
                collapsed the visible label is `sr-only` and the avatar is
                `aria-hidden` — without this the button would announce as
                nothing at all.
              */
              aria-label={`Switch role — signed in as ${session.displayName}, ${currentRoles}`}
            />
          }
        >
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-[0.6875rem] font-bold text-on-brand"
            aria-hidden
          >
            {initialsOf(session.displayName)}
          </span>

          {/*
            `sr-only` rather than unmounted when collapsed, matching the nav
            rows above: dropping it would leave an `aria-hidden` avatar as the
            trigger's only content. `sr-only` is out of flow, so the collapsed
            rail still centres on the disc.
          */}
          <span
            className={cn(
              "flex min-w-0 flex-1 flex-col",
              collapsed && "sr-only"
            )}
          >
            {/* The prototype's caption is the literal word "Role" for a role
                with no sub-types (`app-source.txt` 251). The flask is this
                repo's addition and the only thing marking the control as
                scaffolding — the prototype has no production build to hide
                anything from. */}
            <span className="flex items-center gap-1 text-[0.625rem] font-bold tracking-[0.06em] text-muted-foreground uppercase">
              <FlaskConical
                className="size-3 shrink-0 text-destructive"
                aria-hidden
              />
              Role
            </span>
            <span className="truncate text-[0.8125rem] font-semibold text-sidebar-foreground">
              {currentRoles || session.displayName}
            </span>
          </span>

          {/* Vertical, so it does not mirror under `dir="rtl"` (NFR-07). The
              prototype flips the glyph when the menu opens (`app-source.txt`
              253); Base UI puts `data-popup-open` on the trigger, so the
              rotation is CSS rather than a second piece of state. */}
          {collapsed ? null : (
            <ChevronUp
              className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[popup-open]/dev-role:rotate-180"
              aria-hidden
            />
          )}
        </DropdownMenuTrigger>

        {/*
          `side="top"` is the prototype's upward menu. The explicit width is
          load-bearing: `DropdownMenuContent` defaults to `w-(--anchor-width)`,
          which on the collapsed rail would be a 40px menu.
        */}
        <DropdownMenuContent side="top" align="start" className="w-64 p-0">
          <DropdownMenuGroup>
            {/* Base UI throws if a Label has no Group ancestor — see Header.
                "Switch role", uppercase and letterspaced, is the prototype's own
                header (`app-source.txt` 272). The flask is the mock signal. */}
            <DropdownMenuLabel className="flex items-center gap-1.5 border-b px-3 py-2.5 text-[0.625rem] font-bold tracking-[0.1em] uppercase">
              <FlaskConical
                className="size-3 shrink-0 text-destructive"
                aria-hidden
              />
              Switch role
              <span className="ms-auto font-medium tracking-normal text-destructive normal-case">
                dev only
              </span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>

          {/*
            A radio group, not a list of items. Base UI gives each row
            `role="menuitemradio"` with `aria-checked`, so the current identity
            is announced rather than only drawn with a tick.
          */}
          <DropdownMenuRadioGroup
            value={current}
            onValueChange={(username) =>
              router.push(
                `${ROUTES.CALLBACK}?account=${encodeURIComponent(String(username))}`
              )
            }
          >
            {MOCK_ACCOUNTS.map((account) => (
              <DropdownMenuRadioItem
                key={account.username}
                value={account.username}
                className={cn(
                  // The prototype marks the current row with a 3px bar on its
                  // leading edge and a tinted background, not only a tick
                  // (`app-source.txt` 265). `border-s`, so it moves to the right
                  // edge under `dir="rtl"` (NFR-07).
                  "gap-2.5 rounded-none border-s-[3px] border-transparent py-2",
                  "data-checked:border-s-primary data-checked:bg-accent",
                  // The primitive reserves its indicator space with `pr-8 pl-1.5`
                  // (generated shadcn, physical). Swapped under RTL so the text
                  // does not sit under the tick.
                  "ps-2.5 rtl:pr-1.5 rtl:pl-8"
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-bold",
                    // Filled teal for the identity you are, muted for the rest —
                    // the prototype's own distinction (265).
                    account.username === current
                      ? "bg-sidebar-primary text-on-brand"
                      : "bg-muted text-muted-foreground"
                  )}
                  aria-hidden
                >
                  {initialsOf(account.displayName)}
                </span>
                <span className="flex min-w-0 flex-col">
                  {/*
                    Role first, name second — the prototype's hierarchy, where
                    the big text is what you are switching *to*. The name is
                    kept underneath because these rows are AD accounts rather
                    than bare roles, and two of them have no single role to
                    name: the multi-group account reads "Operator + Management"
                    and the unmapped one "No platform role".
                  */}
                  <span className="truncate text-[0.8125rem] font-semibold">
                    {roleSummary(account.groups)}
                  </span>
                  <span className="truncate text-[0.6875rem] text-muted-foreground">
                    {account.displayName}
                  </span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
