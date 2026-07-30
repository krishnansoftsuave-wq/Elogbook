"use client";

import Link from "next/link";
import { LogOut, Monitor, Moon, Sun } from "lucide-react";

import { BrandMark } from "@/components/layout/BrandMark";
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
 * Two of the prototype's elements are deliberately absent, both because the
 * feature behind them does not exist in this repo yet:
 * - the global search field (196) — there is no search endpoint;
 * - the role switcher (198, `typeControl`) — the developer guide is explicit
 *   that a free role switcher is admin impersonation behind a permission gate,
 *   not a top-bar control, and the session's role comes from `GET /me`.
 *
 * The theme control is this repo's, not the prototype's: the prototype has no
 * dark mode at all, and the code quality standard requires one.
 */
export const Header = () => {
  const { session } = useSession();
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const signOut = useSignOut();

  return (
    <header className="sticky top-0 z-40 flex h-[3.625rem] shrink-0 items-center justify-between gap-4 bg-brand-surface px-5 text-on-brand">
      <Link
        href={ROUTES.HOME}
        className="flex items-center gap-2.5 rounded-md text-[0.96875rem] font-semibold whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-on-brand focus-visible:ring-offset-2 focus-visible:ring-offset-brand-surface"
      >
        <BrandMark size="md" onBrand />
        {BRAND_NAME}
      </Link>

      <div className="flex items-center gap-2">
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
