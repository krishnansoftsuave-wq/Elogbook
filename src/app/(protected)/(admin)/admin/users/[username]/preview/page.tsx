import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { UserPreview } from "@/features/users/components/UserPreview";

export const metadata: Metadata = { title: "User" };

interface UserPreviewPageProps {
  /** Keyed by AD username — there is no synthetic id in this directory. */
  params: Promise<{ username: string }>;
}

export default async function UserPreviewPage({
  params,
}: UserPreviewPageProps) {
  const { username } = await params;

  return (
    <>
      <PageHeader
        title="User"
        description="What Active Directory says about this person, and the one setting this platform owns."
      />
      <UserPreview username={username} />
    </>
  );
}
