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
import { formatPlantDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

/**
 * One notification — **FR-NOT-01**.
 *
 * The prototype carries `icon:'assignment_ind'` and `color:'#B7791F'` **in the
 * data** (`app-source.txt` 75). Both are gone from the contract: a Material
 * Icons glyph name is dead weight in a `lucide-react` app, and a hex on the wire
 * cannot answer to dark mode. `kind` carries the meaning and this maps it.
 *
 * **Reading is a side effect of opening, not a separate chore.** Clicking marks
 * it read and navigates in one act, which is what makes the tray's badge mean
 * something. The prototype has an explicit "Mark all read" instead; see
 * `NotificationsList` for why that is not ported.
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

/** Only overdue is a problem; the rest are events. */
const KIND_TONE: Partial<Record<NotificationKind, string>> = {
  action_overdue: "text-destructive",
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
  /** The tray closes on navigation; the full list does not. */
  onNavigate?: () => void;
}

export const NotificationItem = ({
  notification,
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
          "mt-0.5 shrink-0",
          KIND_TONE[notification.kind] ?? "text-muted-foreground"
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>

      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "text-sm",
              notification.read ? "font-normal" : "font-semibold"
            )}
          >
            {notification.title}
          </span>
          {/*
            Unread is not colour alone (WCAG 1.4.1) — the weight differs, and the
            dot carries a text alternative for anyone who cannot see either.
          */}
          {notification.read ? null : (
            <>
              <span
                className="size-1.5 shrink-0 rounded-full bg-primary"
                aria-hidden
              />
              <span className="sr-only">Unread</span>
            </>
          )}
        </span>
        <span className="text-sm text-muted-foreground">
          {notification.body}
        </span>
        <span className="text-2xs text-muted-foreground">
          {formatPlantDateTime(notification.createdAt)}
        </span>
      </span>
    </>
  );

  const shared =
    "flex w-full items-start gap-3 rounded-md p-3 text-start hover:bg-accent/60";

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
