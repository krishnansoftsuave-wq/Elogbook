import { ChevronRight, House } from "lucide-react";
import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

/**
 * The prototype's `breadcrumb()` (`app-source.txt` 179-183): a home icon,
 * then one `chevron_right` + label per part, the last part styled as the
 * current page (bold, `tealDk`) rather than a link. No feature in this repo
 * had ported it before — `SCREENS.md` lists `breadcrumb (179)` among the
 * primitives to check for first, and none existed, so this is new rather
 * than reused.
 *
 * A part is a link only when it carries an `href` **and** is not the last
 * one — the prototype's own rule (`cursor:p[1]?'pointer':'default'`), since
 * the current page never needs to link to itself.
 *
 * The chevron mirrors with `dir` (`rtl:-scale-x-100`) the same way
 * `Header.tsx`'s sign-out arrow and `Sidebar.tsx`'s panel-toggle icons do: it
 * points into the next crumb, a one-directional glyph, not a symmetric one
 * (NFR-07).
 *
 * **Geometry and colour are `breadcrumb()`'s own numbers** (`app-source.txt`
 * 179–183): container `gap:7` → `gap-1.75`; home icon `fontSize:14` is
 * already `size-3.5`; chevron `fontSize:15` → `size-3.75`; `marginBottom:14`
 * is already `mb-3.5`; `fontSize:12` is already `text-xs`. Crumb colour is by
 * **position, not link-ness** — the prototype colours every part
 * `i===last?C.tealDk:C.teal`, `fontWeight` `600:400`, entirely independent of
 * whether that part has an `onClick` (`p[1]`, which only ever gates the
 * pointer cursor). A non-last part with no `href` therefore still reads
 * `text-primary`, the same as a linked one — it was `text-muted-foreground`
 * here before, which is what let the active crumb blend into
 * `text-foreground` instead of the AA-safe teal (`--brand-dark`) the
 * prototype gives it.
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: readonly BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb = ({ items, className }: BreadcrumbProps) => (
  <nav
    aria-label="Breadcrumb"
    className={cn("mb-3.5 flex items-center gap-1.75 text-xs", className)}
  >
    <Link
      href={ROUTES.HOME}
      aria-label="Home"
      className="text-muted-foreground transition-colors hover:text-foreground"
    >
      <House className="size-3.5" aria-hidden />
    </Link>
    {items.map((item, index) => {
      const isLast = index === items.length - 1;

      return (
        <span key={item.label} className="flex items-center gap-1.75">
          <ChevronRight
            className="size-3.75 text-muted-foreground rtl:-scale-x-100"
            aria-hidden
          />
          {item.href && !isLast ? (
            <Link
              href={item.href}
              className="text-primary transition-colors hover:underline"
            >
              {item.label}
            </Link>
          ) : (
            <span
              className={cn(
                isLast ? "font-semibold text-brand-dark" : "text-primary"
              )}
              aria-current={isLast ? "page" : undefined}
            >
              {item.label}
            </span>
          )}
        </span>
      );
    })}
  </nav>
);
