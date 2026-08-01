import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { AdminTabs } from "@/features/admin/components/AdminTabs";
import { NotificationPermissionsTable } from "@/features/admin/components/NotificationPermissionsTable";

export const metadata: Metadata = { title: "Notification permissions" };

/**
 * §6.4 / **FR-NOT-01** — "Control, per user, which notifications each user
 * may view / receive." Ported from `adminNotifPerm` (`app-source.txt`
 * 2022–2041).
 */
export default function AdminNotificationsPage() {
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Per-user notification permissions"
      />
      <AdminTabs />
      <NotificationPermissionsTable />
    </>
  );
}
