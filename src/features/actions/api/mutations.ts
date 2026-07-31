"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { API_ENDPOINTS } from "@/constants/api";
import { actionKeys } from "@/features/actions/api/keys";
import {
  actionCommentDetailResponseSchema,
  actionDetailResponseSchema,
  toAction,
  toActionComment,
} from "@/features/actions/schemas";
import type {
  ActionAssignValues,
  ActionCommentValues,
  ActionStatusUpdate,
} from "@/features/actions/types";
import { api } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/api-error";
import { ACTION_STATUS_LABEL } from "@/types/operations";

/**
 * FR-PA-04 — move an action through the lifecycle.
 *
 * **This 403s until an Administrator enables the Supervisor Action Workflow**
 * (FR-PA-05), which is the seeded default. The `onError` toast surfaces the
 * server's own message rather than a generic one, because that message names
 * the workflow and is the only way a user learns *why* they were refused.
 *
 * Invalidation, not `setQueryData`: the server is the authority on what the
 * record now looks like, and re-reading is what proves the write landed. That
 * is the whole reason Phase 0a built a mutable store instead of faking writes
 * in the cache.
 */
export const useUpdateActionStatus = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: ActionStatusUpdate) => {
      const response = await api.patch(
        API_ENDPOINTS.ACTIONS.STATUS(id),
        values
      );
      return toAction(actionDetailResponseSchema.parse(response.data).data);
    },
    onSuccess: (action) => {
      queryClient.setQueryData(actionKeys.detail(id), action);
      queryClient.invalidateQueries({ queryKey: actionKeys.all });
      toast.success(
        `${action.id} moved to ${ACTION_STATUS_LABEL[action.status]}`
      );
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

/**
 * **FR-PA-03/05** — record an owner against an action, or clear one.
 *
 * Gated exactly as the status control is, and for the same reason: FR-PA-05
 * makes assignment available *"only when the Administrator enables the
 * workflow"*, and §6.2(a) — the labelled default — says *"no task is assigned to
 * operators"*. `action:assign` is held only by Supervisor and Administrator.
 *
 * `owner_username: null` is a contracted value, not an omission: unassigning is
 * a real act a Supervisor performs when the wrong person was recorded, and the
 * handler has a branch for it.
 *
 * Invalidates rather than patching the cache: the server is the authority on
 * what the record now looks like, and the list shows an owner column too.
 */
export const useAssignActionOwner = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: ActionAssignValues) => {
      const response = await api.put(API_ENDPOINTS.ACTIONS.OWNER(id), values);
      return toAction(actionDetailResponseSchema.parse(response.data).data);
    },
    onSuccess: (action) => {
      queryClient.setQueryData(actionKeys.detail(id), action);
      queryClient.invalidateQueries({ queryKey: actionKeys.all });
      toast.success(
        action.owner
          ? `${action.id} assigned to ${action.owner.displayName}`
          : `${action.id} unassigned`
      );
    },
    onError: (error) => {
      // Surfaces the server's own message, which names the workflow — the only
      // way a Supervisor learns *why* assignment was refused.
      toast.error(getErrorMessage(error));
    },
  });
};

/**
 * FR-SUM-08 / §6.1 — posting is permitted only when the session holds
 * `summary:comment` or the Administrator has granted commenting. Reading the
 * thread is never gated, so a refused post leaves the screen intact and shows
 * the server's explanation.
 */
export const useAddActionComment = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: ActionCommentValues) => {
      const response = await api.post(
        API_ENDPOINTS.ACTIONS.COMMENTS(id),
        values
      );
      return toActionComment(
        actionCommentDetailResponseSchema.parse(response.data).data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: actionKeys.comments(id) });
      toast.success("Comment added");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};
