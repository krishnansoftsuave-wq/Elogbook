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
import { formatRelativeTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

// One notification (FR-NOT-01). Icon and colour are computed client-side from `kind`, not carried on the wire, so they can answer to dark mode. Reading is a side effect of opening — click marks it read and navigates in one act.

const KIND_ICON: Record<NotificationKind, LucideIcon> = {
  action_assigned: UserPlus,
  action_overdue: TriangleAlert,
  summary_ready: FileText,
  report_ready: FileBarChart,
  comment_added: MessageSquare,
  action_completed: CircleCheck,
  handover_note: ArrowRightLeft,
};

// The icon badge's circle colour — one per kind, computed client-side rather than carried on the wire.
const KIND_ACCENT: Record<NotificationKind, string> = {
  action_assigned: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  action_overdue: "bg-destructive/15 text-destructive",
  summary_ready: "bg-primary/15 text-primary",
  report_ready: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
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
  /** The instant to render "time ago" against — required; `null` before mount avoids a hydration mismatch. */
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

      {/* Unread is not colour alone (WCAG 1.4.1) — title weight differs, and the dot has a text alternative. */}
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
        <span className="text-2xs whitespace-nowrap text-muted-foreground">
          {at ? formatRelativeTime(notification.createdAt, at) : null}
        </span>
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
