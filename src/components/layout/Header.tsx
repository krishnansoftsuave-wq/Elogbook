"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, Monitor, Moon, Sun } from "lucide-react";

import { BrandMark } from "@/components/layout/BrandMark";
import { HeaderSearch } from "@/components/layout/HeaderSearch";
import { SubTypePill } from "@/components/layout/SubTypePill";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BRAND_NAME } from "@/constants/brand";
import { ROLE_LABEL } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { useSignOut } from "@/features/auth/api/mutations";
import { useSession } from "@/features/auth/hooks/useSession";
import { NotificationsTray } from "@/features/notifications/components/NotificationsTray";
import { useSettingsStore, type Theme } from "@/store/settingsStore";

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/** Base UI types a radio group's value as `any`; this narrows it back. */
const isTheme = (value: unknown): value is Theme =>
  THEME_OPTIONS.some((option) => option.value === value);

/**
 * `GET /me` returns `roles` as an open `string[]`: §6 lets an Administrator
 * create a custom role through the admin API, and that name will not be in this
 * build's table. Widened to an optional-valued record so an unknown role falls
 * back to its own name instead of failing to type-check or rendering
 * `undefined`.
 */
const ROLE_LABELS: Record<string, string | undefined> = ROLE_LABEL;

const roleLabels = (roles: readonly string[]): string =>
  roles.map((role) => ROLE_LABELS[role] ?? role).join(" · ");

const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

/**
 * The bar's own controls sit on teal, where the default `ghost` variant's
 * `hover:bg-accent` and the `--ring` focus colour both disappear. These
 * override both to white-on-brand: the hover tint reads against the teal, and
 * the focus ring measures 4.51:1 on it, well past WCAG 1.4.11's 3:1.
 */
const ON_BRAND_CONTROL =
  "text-on-brand hover:bg-on-brand/15 hover:text-on-brand focus-visible:ring-on-brand";

/**
 * The prototype's application top bar (`app-source.txt` 191–212): a 58px teal
 * band carrying the logo tile, the product name and the account controls.
 *
 * The prototype's global search field (196) is here as `HeaderSearch`, which
 * explains what it searches: the prototype's own is an inert `<span>`, and the
 * BRD has no keyword-search requirement, so it submits to the assistant —
 * BO-02's "searchable in plain English" — rather than to an endpoint that does
 * not exist.
 *
 * **The role switcher is not here either, and the reason has changed.** The
 * prototype's `typeControl` (198) is a free switcher in the top bar; the
 * developer guide is explicit that such a control is admin impersonation behind
 * a permission gate, and that product feature is still **unbuilt**. What does
 * exist is `DevRoleSwitcher` in the sidebar footer — **dev-only scaffolding**
 * that replaced the `/auth/mock-adfs` account picker, gated the same way and
 * absent from a production bundle. It is not this control and does not
 * discharge the requirement; the session's role still comes from `GET /me`.
 *
 * The theme control is this repo's, not the prototype's: the prototype has no
 * dark mode at all, and the code quality standard requires one.
 */
type TopBarMenu = "subtype" | "notifications";

export const Header = () => {
  const [openMenu, setOpenMenu] = useState<TopBarMenu | null>(null);
  const { session } = useSession();
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const signOut = useSignOut();

  return (
    <header className="sticky top-0 z-40 flex h-[3.625rem] shrink-0 items-center justify-between gap-4 bg-brand-surface px-5 text-on-brand">
      <Link
        href={ROUTES.HOME}
        className="flex shrink-0 items-center gap-2.5 rounded-md text-[0.96875rem] font-semibold whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-on-brand focus-visible:ring-offset-2 focus-visible:ring-offset-brand-surface"
      >
        <BrandMark size="md" onBrand />
        {/*
          Visually hidden below `md` so the search field keeps a usable width at
          375 — the name is the one thing here that is pure decoration once the
          mark is visible. `sr-only` rather than unmounted, so the link keeps its
          accessible name at every breakpoint (NFR-08).
        */}
        <span className="max-md:sr-only">{BRAND_NAME}</span>
      </Link>

      <HeaderSearch />

      <div className="flex shrink-0 items-center gap-2">
        {/*
          FR-NOT-01 in the shell rather than on a screen: a notification about an
          overdue action is only useful if it reaches somebody who is looking at
          something else. Rendered only for a signed-in session, because the tray
          fetches on mount and the sign-in surface has no session to fetch for.
        */}
        {/*
          Order is the prototype's: type pill, bell, avatar (`app-source.txt`
          198–211). The two menus are mutually exclusive there — opening either
          closes the other (231, 249) — which is why their open state is lifted
          here rather than owned by each.
        */}
        <SubTypePill
          open={openMenu === "subtype"}
          onOpenChange={(next) => setOpenMenu(next ? "subtype" : null)}
        />

        {session ? (
          <NotificationsTray
            open={openMenu === "notifications"}
            onOpenChange={(next) => setOpenMenu(next ? "notifications" : null)}
          />
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={ON_BRAND_CONTROL}
              />
            }
            aria-label="Change theme"
          >
            {theme === "dark" ? <Moon aria-hidden /> : <Sun aria-hidden />}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* A radio group, not plain items: these are three mutually
                exclusive states and a plain item exposes no checked state at
                all, so a screen reader could not tell which theme is on
                (WCAG 4.1.2). `closeOnClick` restores what a plain item did by
                default — the radio item's own default is to stay open. */}
            <DropdownMenuRadioGroup
              value={theme}
              onValueChange={(value) => {
                if (isTheme(value)) setTheme(value);
              }}
            >
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <DropdownMenuRadioItem key={value} value={value} closeOnClick>
                  <Icon className="size-4" aria-hidden />
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {session ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={ON_BRAND_CONTROL}
                />
              }
              aria-label="Account menu"
            >
              {/* The prototype's 32px white disc with teal initials (211).
                  `--brand-surface` on `--on-brand` measures 4.51:1 in both
                  themes — the pairing does not flip, because the bar it sits
                  on does not either. */}
              <Avatar className="size-8">
                <AvatarFallback className="bg-on-brand text-[0.75rem] font-bold text-brand-surface">
                  {initials(session.displayName)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* Base UI's label is a group label and throws without a group
                  ancestor — it is not a bare heading like Radix's. */}
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <span className="block truncate font-medium">
                    {session.displayName}
                  </span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">
                    {roleLabels(session.roles)}
                  </span>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              {/* §9: there is no logout endpoint — signing out discards the
                  token locally and tells the sibling tabs. */}
              <DropdownMenuItem onClick={signOut}>
                {/* Mirrored with `dir` for the same reason `LogIn` is: the
                    glyph's door and arrow are one-directional (NFR-07). */}
                <LogOut className="size-4 rtl:-scale-x-100" aria-hidden />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  );
};
