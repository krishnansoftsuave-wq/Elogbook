"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { API_ENDPOINTS } from "@/constants/api";
import {
  suggestionDetailResponseSchema,
  toSuggestion,
} from "@/features/actions/schemas";
import type { SuggestionConfirmValues } from "@/features/actions/types";
import { summaryKeys } from "@/features/summaries/api/keys";
import { suggestionKeys } from "@/features/suggestions/api/keys";
import { api } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/api-error";

/**
 * **FR-PA-02** — "Have a Supervisor review AI-suggested actions and confirm
 * whether each is included in the summary; **no assignment to operators**."
 *
 * The last clause is the whole design. Confirming does **not** create a pending
 * action: the handler writes an `ai_confirmation` onto the current shift summary
 * and nothing else, which is §6.2(a)'s default flow — "confirm **only** whether
 * each is included as a comment in the summary report — no task is assigned to
 * operators and there is no escalation step".
 *
 * **Invalidating the summary is therefore not incidental.** The visible effect of
 * confirming is on a *different* screen: the AI-confirmations card
 * `SummaryDetail` renders. Without invalidating `summaryKeys`, a Supervisor
 * confirms a suggestion, opens the summary, and finds their decision missing —
 * from a cache, not from the server.
 *
 * ⚠️ **"Dismiss" is an inference.** The BRD gives the Supervisor only a *confirm*
 * verb and never says what becomes of a suggestion they do not want — FR-PA-02
 * and §6.2 have no reject, decline or dismiss. The **contract** answers it
 * (`{ confirmed: boolean }`, and the handler removes any existing confirmation
 * when false), so both paths exist and are honoured here. What "dismissed" means
 * to the AI feedback loop is an open question for OLNG; FR-FB-01's
 * "confirm/reject on AI-suggested pending actions" may or may not be the same
 * act.
 */
export const useConfirmSuggestion = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: SuggestionConfirmValues) => {
      const response = await api.post(
        API_ENDPOINTS.SUGGESTIONS.CONFIRM(id),
        values
      );
      return toSuggestion(
        suggestionDetailResponseSchema.parse(response.data).data
      );
    },
    onSuccess: (suggestion) => {
      queryClient.invalidateQueries({ queryKey: suggestionKeys.all });
      // Where the decision actually shows up (FR-PA-02, FR-SUM-01).
      queryClient.invalidateQueries({ queryKey: summaryKeys.all });

      toast.success(
        suggestion.confirmed
          ? `${suggestion.id} confirmed — it will appear in the shift summary`
          : `${suggestion.id} dismissed`
      );
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};
