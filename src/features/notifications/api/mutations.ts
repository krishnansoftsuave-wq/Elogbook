"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { API_ENDPOINTS } from "@/constants/api";
import { notificationKeys } from "@/features/notifications/api/keys";
import {
  notificationDetailResponseSchema,
  notificationsMarkAllReadResponseSchema,
  toNotification,
} from "@/features/notifications/schemas";
import { api } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/api-error";

/**
 * Marks one notification read — **FR-NOT-01**.
 *
 * The handler is **idempotent** (marking an already-read notification succeeds
 * and changes nothing) and answers **404, not 403**, for someone else's id. That
 * distinction is deliberate on the server and worth not undoing here: a 403
 * would confirm the record exists, which for a per-user resource is itself a
 * disclosure.
 *
 * **No success toast.** Reading a notification is not an achievement, and a
 * toast for each one in a tray of six would be worse than the notifications.
 * `onError` stays, because a mark-read that silently failed would leave a badge
 * counting something the user has already dealt with.
 */
export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(
        API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id)
      );
      return toNotification(
        notificationDetailResponseSchema.parse(response.data).data
      );
    },
    onSuccess: () => {
      // Both surfaces: the tray badge and the full list read the same records.
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

/**
 * Marks every one of the caller's unread notifications read — the prototype's
 * header "Mark all read" (`app-source.txt` 1849).
 *
 * **One request, not one per unread row.** An earlier version looped
 * `useMarkNotificationRead`'s mutation with `Promise.allSettled`, which turned
 * one click into N writes, N cache invalidations, and let the action
 * half-succeed with no atomic outcome to report (NFR-12). `POST
 * /notifications/read-all` does the whole thing server-side in one call.
 *
 * The success toast lives here rather than the button: it is the one place
 * that actually knows the write landed.
 */
export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post(
        API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ
      );
      return notificationsMarkAllReadResponseSchema.parse(response.data).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      toast.success("All notifications marked read");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};
