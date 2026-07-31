import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The prototype's `emptyState` (app-source.txt 1177–1182) — a circled icon, a
 * title and a line of explanation.
 *
 * Worth noting what it is *for*, because the prototype uses it for two different
 * situations and the wording matters: "no records exist yet" and "your filter
 * matched nothing" need different copy, and the second needs a way out. Callers
 * supply both the message and, where relevant, an `action` — which is why this
 * takes a slot rather than hardcoding a "Clear filters" button.
 *
 * The icon is `aria-hidden`: the title beside it already names the state, and
 * `<h3>`/`<p>` give the block real semantics instead of the prototype's nested
 * `<div>`s.
 */

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Optional escape hatch — typically "Clear filters". */
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) => (
  <div
    className={cn(
      "flex flex-col items-center px-5 py-12 text-center",
      className
    )}
  >
    <span
      className="mb-3.5 flex size-14 items-center justify-center rounded-full bg-muted"
      aria-hidden
    >
      <Icon className="size-7 text-muted-foreground" />
    </span>

    <h3 className="text-base font-semibold text-foreground">{title}</h3>

    {description && (
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">
        {description}
      </p>
    )}

    {action && <div className="mt-4">{action}</div>}
  </div>
);
