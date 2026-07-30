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
import { useDeleteUser } from "@/features/users/api/mutations";
import type { User } from "@/types/user";

interface DeleteUserDialogProps {
  user: User | null;
  onClose: () => void;
}

export const DeleteUserDialog = ({ user, onClose }: DeleteUserDialogProps) => {
  const deleteUser = useDeleteUser();

  const handleConfirm = () => {
    if (!user) return;
    deleteUser.mutate(user.id, { onSuccess: onClose });
  };

  return (
    <AlertDialog
      open={Boolean(user)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {user?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the account and its access immediately. Logbook entries
            they authored are kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteUser.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteUser.isPending}
            onClick={handleConfirm}
          >
            {deleteUser.isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
