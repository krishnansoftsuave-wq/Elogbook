import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { NotificationsList } from "@/features/notifications/components/NotificationsList";

export const metadata: Metadata = { title: "Notifications" };

/**
 * §7.9 — the notification list. The prototype's `notifications` screen
 * (`app-source.txt` 1846–1873).
 *
 * `NotificationsList` records what was and was not ported, including why there
 * is no "Mark all read".
 */
export default function NotificationsPage() {
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Assignments, overdue actions and new summaries addressed to you."
      />
      <NotificationsList />
    </>
  );
}
