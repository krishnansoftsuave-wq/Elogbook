import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import {
  MarkAllReadButton,
  NotificationsList,
} from "@/features/notifications/components/NotificationsList";

export const metadata: Metadata = { title: "Notifications" };

// §7.9 — the notification list, its header "Mark all read" and its two-column body.
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
