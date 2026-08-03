import { Info, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A tinted, icon-led message block — the shape this codebase had already
 * settled on and copy-pasted eight times.
 *
 * ## Why it exists
 *
 * The same eleven Tailwind classes (`flex items-start gap-2 rounded-md border
 * border-destructive/40 bg-destructive/10 …`) appeared verbatim in
 * `ShiftTimingsForm`, `WorkflowSettings`, `AssistantChat`, `AuditTable` and
 * `SuggestionsPanel` before this file existed. That is not a style problem: a
 * copied block drifts, and a drifted error state is one that no longer meets
 * the 4.5:1 contrast `.claude/rules/03` requires in both themes, in a place
 * nobody thinks to check.
 *
 * ## `role="alert"` is opt-in
 *
 * An alert is announced immediately and interrupts whatever a screen reader was
 * saying. That is right for "your save failed" and wrong for a standing caveat
 * like "these figures are illustrative", which would re-interrupt on every
 * render. `live` defaults to false, so a caller has to decide.
 *
 * ## What it is not
 *
 * Not `EmptyState` — that one is for "there is nothing here", is centred,
 * larger, and takes an action slot. This is for "here is something you need to
 * know about what is here". A card with no rows uses `EmptyState`; a card whose
 * rows are fabricated uses this.
 */

export type NoticeTone = "destructive" | "warning" | "info";

const TONE: Record<NoticeTone, string> = {
  destructive: "border-destructive/40 bg-destructive/10 text-destructive",
  warning: "border-warning/40 bg-warning/10 text-warning",
  info: "border-border bg-muted/50 text-muted-foreground",
};

const DEFAULT_ICON: Record<NoticeTone, LucideIcon> = {
  destructive: TriangleAlert,
  warning: TriangleAlert,
  info: Info,
};

interface NoticeProps {
  tone?: NoticeTone;
  /** Overrides the tone's default. */
  icon?: LucideIcon;
  /**
   * Announce immediately via `role="alert"`. Use for something that just went
   * wrong; leave off for a standing caveat.
   */
  live?: boolean;
  children: ReactNode;
  className?: string;
}

export const Notice = ({
  tone = "destructive",
  icon,
  live = false,
  children,
  className,
}: NoticeProps) => {
  const Icon = icon ?? DEFAULT_ICON[tone];

  return (
    <p
      {...(live ? { role: "alert" } : {})}
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm",
        TONE[tone],
        className
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
};
