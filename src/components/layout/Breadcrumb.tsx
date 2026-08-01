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
    className={cn("mb-3.5 flex items-center gap-1.5 text-xs", className)}
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
        <span key={item.label} className="flex items-center gap-1.5">
          <ChevronRight
            className="size-3.5 text-muted-foreground rtl:-scale-x-100"
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
                isLast
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground"
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
