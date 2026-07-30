import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { AddEntryPanel } from "@/features/entries/components/AddEntryPanel";

export const metadata: Metadata = { title: "New entry" };

export default function AddEntryPage() {
  return (
    <>
      <PageHeader
        title="New entry"
        description="Save it as a draft, or submit it straight for signature."
      />
      <AddEntryPanel />
    </>
  );
}
