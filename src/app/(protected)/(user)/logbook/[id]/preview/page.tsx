import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { EntryPreview } from "@/features/entries/components/EntryPreview";

export const metadata: Metadata = { title: "Entry" };

interface EntryPreviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function EntryPreviewPage({
  params,
}: EntryPreviewPageProps) {
  const { id } = await params;

  return (
    <>
      <PageHeader title="Entry" description="Read-only view of the record." />
      <EntryPreview entryId={id} />
    </>
  );
}
