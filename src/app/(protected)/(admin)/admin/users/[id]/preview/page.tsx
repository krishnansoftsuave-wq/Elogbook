import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { UserPreview } from "@/features/users/components/UserPreview";

export const metadata: Metadata = { title: "User preview" };

interface UserPreviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function UserPreviewPage({
  params,
}: UserPreviewPageProps) {
  const { id } = await params;

  return (
    <>
      <PageHeader title="User" description="Read-only view of the account." />
      <UserPreview userId={id} />
    </>
  );
}
