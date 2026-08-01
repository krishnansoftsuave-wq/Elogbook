"use client";

import Link from "next/link";
import {
  ArrowRightLeft,
  CircleCheck,
  FileBarChart,
  FileText,
  MessageSquare,
  TriangleAlert,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { useMarkNotificationRead } from "@/features/notifications/api/mutations";
import type {
  Notification,
  NotificationKind,
} from "@/features/notifications/schemas";
import { formatPlantTimestamp, formatRelativeTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

/**
 * One notification — **FR-NOT-01**.
 *
 * The prototype carries `icon:'assignment_ind'` and `color:'#B7791F'` **in the
 * data** (`app-source.txt` 75). Both are gone from the contract: a Material
 * Icons glyph name is dead weight in a `lucide-react` app, and a hex on the wire
 * cannot answer to dark mode. `kind` carries the meaning; `KIND_ICON` and
 * `KIND_ACCENT` below map it to a `lucide-react` glyph and a theme token,
 * computed client-side rather than carried on the wire — which is what lets
 * the same badge answer to dark mode the prototype's hex could not.
 *
 * **Reading is a side effect of opening, not a separate chore.** Clicking marks
 * it read and navigates in one act, which is what makes the tray's badge mean
 * something. The prototype has an explicit "Mark all read" instead; see
 * `NotificationsList` for where that is ported.
 */

const KIND_ICON: Record<NotificationKind, LucideIcon> = {
  action_assigned: UserPlus,
  action_overdue: TriangleAlert,
  summary_ready: FileText,
  report_ready: FileBarChart,
  comment_added: MessageSquare,
  action_completed: CircleCheck,
  handover_note: ArrowRightLeft,
};

/**
 * The icon badge's circle colour — one per kind, mirroring the prototype's
 * per-notification `color` field without carrying a hex on the wire.
 *
 * The four FR-NOT-01 kinds use `globals.css`'s contrast-tuned semantic
 * tokens, not raw Tailwind palette colours: `--warning`/`--success` (and
 * `--destructive`/`--primary`, already tokens) are measured to clear 4.5:1 on
 * their own tint the way a bare `amber-600`/`emerald-600` never was.
 *
 * **The three prototype-only kinds stay on raw Tailwind colour for now —
 * deliberately, not an oversight.** `action_completed` mapped onto
 * `--success` would collide with `report_ready`, now the only kind that owns
 * it; `handover_note`'s violet has no token at all. Both are DS-9.3 palette
 * calls ("never invent against it") that need the design-system owner, not a
 * guess made here to close a lint warning.
 */
const KIND_ACCENT: Record<NotificationKind, string> = {
  action_assigned: "bg-warning/15 text-warning",
  action_overdue: "bg-destructive/15 text-destructive",
  summary_ready: "bg-primary/15 text-primary",
  report_ready: "bg-success/15 text-success",
  // Prototype-only, unresolved DS-9.3 colours — see the doc comment above.
  comment_added: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  action_completed: "bg-green-500/15 text-green-600 dark:text-green-400",
  handover_note: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
};

/**
 * Where a notification leads, or `null` when this build hosts no such screen.
 *
 * `report` resolves to nothing on purpose: reports are §7.8 and belong to
 * Phase 4. A link to a route that does not exist would 404 into the app's own
 * not-found page, which reads as breakage rather than as "not built yet".
 */
export const notificationHref = (notification: Notification): string | null => {
  if (!notification.targetId) return null;

  switch (notification.targetType) {
    case "action":
      return ROUTES.ACTION_DETAIL(notification.targetId);
    case "summary":
      return ROUTES.SUMMARY_DETAIL(notification.targetId);
    case "report":
    case "none":
      return null;
  }
};

interface NotificationItemProps {
  notification: Notification;
  /**
   * The instant to render "time ago" against — required, same rule as
   * `OverdueFlag.at`. `null` means the clock is not known yet (pre-mount) and
   * renders no time text rather than risking a hydration mismatch.
   */
  at: Date | null;
  /** The tray closes on navigation; the full list does not. */
  onNavigate?: () => void;
}

export const NotificationItem = ({
  notification,
  at,
  onNavigate,
}: NotificationItemProps) => {
  const Icon = KIND_ICON[notification.kind];
  const href = notificationHref(notification);
  const markRead = useMarkNotificationRead();

  const open = () => {
    if (!notification.read) markRead.mutate(notification.id);
    onNavigate?.();
  };

  const body = (
    <>
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center self-center rounded-full",
          KIND_ACCENT[notification.kind]
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            "text-sm",
            notification.read ? "font-normal" : "font-semibold"
          )}
        >
          {notification.title}
        </span>
        <span className="text-sm text-muted-foreground">
          {notification.body}
        </span>
      </span>

      {/*
        Right-aligned, same row — the prototype's dot-then-time layout
        (app-source.txt 1877). Unread is still not colour alone (WCAG 1.4.1):
        the title's weight differs, and the dot carries a text alternative for
        anyone who cannot see either.
      */}
      <span className="flex shrink-0 items-center gap-1.5 self-center">
        {notification.read ? null : (
          <>
            <span
              className="size-1.5 shrink-0 rounded-full bg-primary"
              aria-hidden
            />
            <span className="sr-only">Unread</span>
          </>
        )}
        {/*
          `dateTime` and `title` carry the machine-readable/exact instant a
          bare "2h ago" doesn't — under 7 days there is otherwise nothing on
          this row a screen reader or a hover can resolve to an actual date.
        */}
        {at ? (
          <time
            dateTime={notification.createdAt}
            title={formatPlantTimestamp(notification.createdAt)}
            className="text-2xs whitespace-nowrap text-muted-foreground"
          >
            {formatRelativeTime(notification.createdAt, at)}
          </time>
        ) : (
          <span className="text-2xs whitespace-nowrap text-muted-foreground" />
        )}
      </span>
    </>
  );

  const shared = cn(
    "flex w-full items-start gap-3 rounded-md p-3 text-start hover:bg-accent/60",
    !notification.read && "bg-primary/5"
  );

  return (
    <li>
      {href ? (
        <Link href={href} className={shared} onClick={open}>
          {body}
        </Link>
      ) : (
        /*
          Still a button when there is nowhere to go: marking read is a real act,
          and a div with an onClick would be unreachable by keyboard.
        */
        <button type="button" className={shared} onClick={open}>
          {body}
        </button>
      )}
    </li>
  );
};
