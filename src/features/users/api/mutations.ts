"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { API_ENDPOINTS } from "@/constants/api";
import { userKeys } from "@/features/users/api/keys";
import { userDetailResponseSchema } from "@/features/users/schemas";
import type { UserAccessValues } from "@/features/users/types";
import { api } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/api-error";
import { toUser } from "@/types/user";

interface UpdateUserAccessVariables extends UserAccessValues {
  username: string;
}

/**
 * **FR-ADM-01** — change a person's platform access.
 *
 * The only write this feature has, and the only one it should have.
 * `useCreateUser` and `useDeleteUser` are gone: identities originate in Active
 * Directory (**FR-AUTH-02**), so a user created here would carry no AD groups
 * and `resolveSession` could never sign them in. Creating and removing people
 * are AD-side actions, and FR-ADM-01's "create / remove" is reported unmet
 * rather than faked with a control that produces an unusable record.
 *
 * Roles are not here either — see `userAccessUpdateSchema`. FR-AUTH-02 governs
 * group-to-role mapping through the AD admin, so changing what somebody can do
 * means changing their groups, or the group→role table (Phase 3c).
 *
 * **`username` is a mutation variable, not a hook argument.** The control sits
 * on a table row, so one mounted hook serves whichever person the confirm dialog
 * is pointed at; closing over a username would need the hook remounted per
 * target. The detail screen passes the same shape.
 *
 * No `router.push`. The old create/update hooks navigated back to the list on
 * success, which suited a full-page form; sending somebody elsewhere after a
 * toggle would lose their place in a directory they are working through.
 */
export const useUpdateUserAccess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username, ...values }: UpdateUserAccessVariables) => {
      const response = await api.patch(
        API_ENDPOINTS.USERS.ACCESS(username),
        values
      );
      return toUser(userDetailResponseSchema.parse(response.data).data);
    },
    onSuccess: (user) => {
      // Keyed off the response, not the request: the server is what decides
      // which record this is.
      queryClient.setQueryData(userKeys.detail(user.username), user);
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success(
        user.status === "active"
          ? `${user.displayName} can sign in again`
          : `${user.displayName} is suspended from the platform`
      );
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};
