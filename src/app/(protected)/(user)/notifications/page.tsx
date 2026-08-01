import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import {
  MarkAllReadButton,
  NotificationsList,
} from "@/features/notifications/components/NotificationsList";

export const metadata: Metadata = { title: "Notifications" };

/**
 * §7.9 — the notification list. The prototype's `notifications` screen
 * (`app-source.txt` 1846–1873), including its header's "Mark all read" and
 * its two-column body.
 *
 * `NotificationsList` records what of that is real data and what is static
 * content carried over from the prototype as-is.
 */
export default function NotificationsPage() {
  return (
    <>
      <PageHeader
        title="Notifications"
        description="In-app & email alerts"
        actions={<MarkAllReadButton />}
      />
      <NotificationsList />
    </>
  );
}
