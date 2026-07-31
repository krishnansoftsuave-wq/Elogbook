import type { NotificationFilters } from "@/features/notifications/types";

/**
 * Query keys for in-app notifications (FR-NOT-01).
 *
 * `unread` is a separate member from `list` because the header tray and the
 * `/notifications` screen ask different questions of the same resource, and the
 * tray's badge must not be invalidated into a spinner every time somebody pages
 * the full list.
 */
export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
  list: (filters: NotificationFilters) =>
    [...notificationKeys.lists(), filters] as const,
  /** The tray: the newest few, whatever their read state. */
  recent: () => [...notificationKeys.all, "recent"] as const,
};
