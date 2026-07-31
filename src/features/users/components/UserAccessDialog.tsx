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
import { useUpdateUserAccess } from "@/features/users/api/mutations";
import type { User } from "@/types/user";

interface UserAccessDialogProps {
  /** The person whose access is being changed; `null` keeps the dialog closed. */
  user: User | null;
  onClose: () => void;
}

/**
 * Confirms a suspend or a reinstate — **FR-ADM-01**, the one write the admin
 * directory has.
 *
 * The copy is deliberately about *this platform* rather than about the account.
 * Suspending here does not disable an AD account and does not remove anyone's
 * history: **FR-AUTH-02** makes Active Directory the system of record and this a
 * consumer of it. An Administrator who believed otherwise would think they had
 * handled a leaver when they had not, so the description says which of the two
 * systems is being changed.
 *
 * It says a suspended account is "held out of this platform" — the meaning of
 * the status — rather than promising they cannot sign in. ⚠️ **Nothing enforces
 * it yet:** `mocks/auth/resolve.ts` derives a session from the token and never
 * reads this collection, so today the flag is recorded and audited but does not
 * deny a request. Wiring that touches the shared auth gate every route and test
 * depends on, and it needs a decision about what happens to a session suspended
 * mid-use — reported as an owner decision rather than slipped in here.
 *
 * There is no delete counterpart, and its absence is the point — see
 * `app/api/v1/users/[username]/route.ts`.
 */
export const UserAccessDialog = ({ user, onClose }: UserAccessDialogProps) => {
  const updateAccess = useUpdateUserAccess();
  const isSuspending = user?.status === "active";

  const handleConfirm = () => {
    if (!user) return;
    updateAccess.mutate(
      {
        username: user.username,
        status: isSuspending ? "suspended" : "active",
      },
      { onSuccess: onClose }
    );
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
          <AlertDialogTitle>
            {isSuspending
              ? `Suspend ${user?.displayName}?`
              : `Restore access for ${user?.displayName}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isSuspending
              ? "Their platform access is marked suspended and they are held out of this platform. Their Active Directory account and their logbook entries are untouched — accounts are created and removed in AD."
              : "Their platform access is restored, with the roles their Active Directory groups give them."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={updateAccess.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={updateAccess.isPending}
            onClick={handleConfirm}
          >
            {isSuspending ? "Suspend" : "Restore access"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
