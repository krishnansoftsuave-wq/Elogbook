"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useUpdateEntry } from "@/features/entries/api/mutations";
import { useEntry } from "@/features/entries/api/queries";
import { EntryForm } from "@/features/entries/components/EntryForm";

interface EditEntryPanelProps {
  entryId: string;
}

export const EditEntryPanel = ({ entryId }: EditEntryPanelProps) => {
  const { data: entry, isLoading, isError } = useEntry(entryId);
  const updateEntry = useUpdateEntry(entryId);

  if (isLoading) {
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    );
  }

  // The failure itself was already toasted by QueryCache.onError.
  if (isError || !entry) {
    return (
      <p className="text-sm text-muted-foreground">
        This entry could not be loaded.
      </p>
    );
  }

  if (entry.status === "signed") {
    return (
      <p className="text-sm text-muted-foreground">
        This entry has been signed and can no longer be edited.
      </p>
    );
  }

  return (
    <EntryForm
      // Remount once the record arrives so RHF picks up the loaded values.
      key={entry.id}
      defaultValues={{
        title: entry.title,
        body: entry.body,
        performedAt: entry.performedAt.slice(0, 10),
        status: entry.status,
      }}
      submitLabel="Save changes"
      isSubmitting={updateEntry.isPending}
      onSubmit={(values) => updateEntry.mutate(values)}
    />
  );
};
