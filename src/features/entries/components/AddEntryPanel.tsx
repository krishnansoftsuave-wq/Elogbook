"use client";

import { useCreateEntry } from "@/features/entries/api/mutations";
import { EntryForm } from "@/features/entries/components/EntryForm";

export const AddEntryPanel = () => {
  const createEntry = useCreateEntry();

  return (
    <EntryForm
      submitLabel="Save entry"
      isSubmitting={createEntry.isPending}
      onSubmit={(values) => createEntry.mutate(values)}
    />
  );
};
