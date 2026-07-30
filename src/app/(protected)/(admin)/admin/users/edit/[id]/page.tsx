import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { EditUserPanel } from "@/features/users/components/EditUserPanel";

export const metadata: Metadata = { title: "Edit user" };

interface EditUserPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const { id } = await params;

  return (
    <>
      <PageHeader
        title="Edit user"
        description="Changes take effect the next time they load the app."
      />
      <EditUserPanel userId={id} />
    </>
  );
}
