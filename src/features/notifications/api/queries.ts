"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { API_ENDPOINTS } from "@/constants/api";
import { notificationKeys } from "@/features/notifications/api/keys";
import {
  notificationListResponseSchema,
  toNotification,
} from "@/features/notifications/schemas";
import type { NotificationFilters } from "@/features/notifications/types";
import { api } from "@/lib/api-client";
import { DASHBOARD_REFRESH } from "@/lib/query-refresh";

/** How many the header tray shows before deferring to the full screen. */
export const TRAY_SIZE = 6;

/**
 * The full list — **FR-NOT-01**.
 *
 * The endpoint scopes to `session.username` and filters by the Administrator's
 * per-user permission matrix, so there is no recipient parameter to pass: a
 * client that could ask for somebody else's notifications would be the bug
 * FR-NOT-01's "per user" clause exists to prevent.
 */
export const useNotificationsList = (filters: NotificationFilters) =>
  useQuery({
    queryKey: notificationKeys.list(filters),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.NOTIFICATIONS.LIST, {
        params: {
          page: filters.page,
          pageSize: filters.pageSize,
          ...(filters.unreadOnly ? { unread: true } : {}),
        },
      });
      const page = notificationListResponseSchema.parse(response.data).data;

      return { ...page, items: page.items.map(toNotification) };
    },
    placeholderData: keepPreviousData,
  });

/**
 * The header tray: the newest few, plus a **true** unread count for the badge.
 *
 * **This one refreshes.** A notification is the one thing on screen whose whole
 * purpose is to arrive while you are looking at something else — an overdue
 * action or a summary becoming available (FR-NOT-01). A tray that only updated
 * on navigation would tell an operator about an overdue action when they had
 * already gone looking for it. `DASHBOARD_REFRESH` carries FR-HOME-05's
 * ~1-minute cadence and pauses in a background tab, which is what keeps NFR-03's
 * 500 concurrent users affordable.
 *
 * **Two requests, because one produced a false number.** Counting unread within
 * the six fetched rows looked frugal and was wrong: with the newest six read and
 * fourteen older ones unread, the badge announced *"none unread"*. That is not
 * conservative under-reporting, it is a false statement about somebody's inbox.
 * The second request asks for one unread row purely to read `total` off the
 * envelope, so the count is the server's rather than a sample of it.
 */
export const useNotificationTray = () =>
  useQuery({
    queryKey: notificationKeys.recent(),
    queryFn: async () => {
      const [recent, unread] = await Promise.all([
        api.get(API_ENDPOINTS.NOTIFICATIONS.LIST, {
          params: { page: 1, pageSize: TRAY_SIZE },
        }),
        api.get(API_ENDPOINTS.NOTIFICATIONS.LIST, {
          params: { page: 1, pageSize: 1, unread: true },
        }),
      ]);

      const page = notificationListResponseSchema.parse(recent.data).data;
      const unreadPage = notificationListResponseSchema.parse(unread.data).data;

      return {
        items: page.items.map(toNotification),
        unreadCount: unreadPage.total,
        total: page.total,
      };
    },
    ...DASHBOARD_REFRESH,
  });
