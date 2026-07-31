"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { API_ENDPOINTS } from "@/constants/api";
import { summaryKeys } from "@/features/summaries/api/keys";
import {
  summaryDetailResponseSchema,
  toSummary,
} from "@/features/summaries/schemas";
import type {
  SummaryCommentValues,
  SummaryGenerateValues,
} from "@/features/summaries/types";
import { api } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/api-error";

/**
 * **FR-SUM-02** — on-demand generation. **FR-SUM-04** is why nothing here waits
 * for anybody: "Allow any authorised user to create a summary **without a
 * mandatory approval gate**." There is no submit-for-review step to build.
 *
 * ⚠️ **FR-SUM-04 does not stop there.** Its full wording is "…without a
 * mandatory approval gate; **support edits**", and §6.1 names the same
 * capability — "Comment on / **edit** the shift summary only if the
 * Administrator / Super User has granted comment access". **Editing is not
 * built**: there is no `PATCH /summaries/:id` in the Phase 0a contract and no
 * mutation for it here. Reported as a gap rather than quietly satisfied by the
 * half of the sentence that is done.
 *
 * Generating for a shift that already has a summary **replaces** it and answers
 * 200; only a new shift answers 201. That is NFR-12's "no duplicate records"
 * made concrete, and it means the button is safe to press twice.
 */
export const useGenerateSummary = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: SummaryGenerateValues) => {
      const response = await api.post(API_ENDPOINTS.SUMMARIES.GENERATE, values);
      return toSummary(summaryDetailResponseSchema.parse(response.data).data);
    },
    onSuccess: (summary) => {
      queryClient.setQueryData(summaryKeys.detail(summary.id), summary);
      queryClient.invalidateQueries({ queryKey: summaryKeys.all });
      toast.success(`Shift summary ${summary.id} generated`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

/**
 * **FR-SUM-08** — "Control comment access on a shift summary for Operator and
 * Supervisor through the Admin / Super User."
 *
 * The API decides, not this hook: the handler permits the post when the session
 * holds `summary:comment` **or** the Administrator has enabled the
 * `operator_comment_permission` workflow. The UI hides the composer under the
 * same predicate, but a refusal still arrives as a 403 whose message names the
 * reason — so `onError` surfaces the server's own wording rather than inventing
 * a generic one. Hiding a button is never the access control (FR-ADM-03).
 *
 * Invalidates the **detail**, not a comments key. Comments are embedded in
 * `GET /summaries/:id`; there is no comments read endpoint to invalidate.
 */
export const useAddSummaryComment = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: SummaryCommentValues) => {
      await api.post(API_ENDPOINTS.SUMMARIES.COMMENTS(id), values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: summaryKeys.detail(id) });
      toast.success("Comment added");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};
