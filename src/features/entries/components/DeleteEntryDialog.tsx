"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteEntry } from "@/features/entries/api/mutations";
import type { Entry } from "@/types/entry";

interface DeleteEntryDialogProps {
  entry: Entry | null;
  onClose: () => void;
}

export const DeleteEntryDialog = ({
  entry,
  onClose,
}: DeleteEntryDialogProps) => {
  const deleteEntry = useDeleteEntry();

  const handleConfirm = () => {
    if (!entry) return;
    deleteEntry.mutate(entry.id, { onSuccess: onClose });
  };

  return (
    <AlertDialog
      open={Boolean(entry)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{entry?.title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the entry. Signed entries cannot be deleted
            — withdraw the signature first.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteEntry.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteEntry.isPending}
            onClick={handleConfirm}
          >
            {deleteEntry.isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
