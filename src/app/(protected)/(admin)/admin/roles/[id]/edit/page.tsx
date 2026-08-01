import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { EditRolePanel } from "@/features/admin/components/EditRolePanel";

export const metadata: Metadata = { title: "Edit role" };

interface AdminRoleEditPageProps {
  params: Promise<{ id: string }>;
}

/** The edit half of `roleFormScreen` (`app-source.txt` 1613–1630). */
export default async function AdminRoleEditPage({
  params,
}: AdminRoleEditPageProps) {
  const { id } = await params;

  return (
    <>
      <PageHeader
        title="Edit role"
        description="Define permissions, data scope and AD mapping."
      />
      <EditRolePanel roleId={id} />
    </>
  );
}
