import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { EditEntryPanel } from "@/features/entries/components/EditEntryPanel";

export const metadata: Metadata = { title: "Edit entry" };

interface EditEntryPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEntryPage({ params }: EditEntryPageProps) {
  const { id } = await params;

  return (
    <>
      <PageHeader
        title="Edit entry"
        description="Signed entries are locked and cannot be changed here."
      />
      <EditEntryPanel entryId={id} />
    </>
  );
}
