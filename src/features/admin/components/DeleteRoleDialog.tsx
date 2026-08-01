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
import { useDeleteRole } from "@/features/admin/api/mutations";
import type { AdminRole } from "@/features/admin/schemas";

interface DeleteRoleDialogProps {
  role: AdminRole | null;
  onClose: () => void;
}

/**
 * §6 / FR-ADM-02. Confirms before deleting, unlike the prototype's own button
 * (`app-source.txt` 1579), which fires straight into a "role in use" toast —
 * this repo's own convention (`DeleteEntryDialog`) always confirms a
 * destructive action rather than skipping the step for a screen the mock
 * happens to block.
 *
 * The block itself still comes from the server: `useDeleteRole`'s `onError`
 * surfaces the 409 the handler answers for a base role or one with members,
 * so this dialog does not duplicate that rule client-side.
 */
export const DeleteRoleDialog = ({ role, onClose }: DeleteRoleDialogProps) => {
  const deleteRole = useDeleteRole();

  const handleConfirm = () => {
    if (!role) return;
    deleteRole.mutate(role.id, { onSuccess: onClose });
  };

  return (
    <AlertDialog
      open={Boolean(role)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{role?.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the role. A base role, or a role with
            members still assigned to it, cannot be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteRole.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteRole.isPending}
            onClick={handleConfirm}
          >
            {deleteRole.isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
