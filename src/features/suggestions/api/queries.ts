"use client";

import { useQuery } from "@tanstack/react-query";

import { API_ENDPOINTS, MAX_PAGE_SIZE } from "@/constants/api";
import {
  suggestionListResponseSchema,
  toSuggestion,
} from "@/features/actions/schemas";
import { suggestionKeys } from "@/features/suggestions/api/keys";
import { api } from "@/lib/api-client";

/**
 * **FR-PA-01** — the AI-extracted half of "a mix of manual tagging and automatic
 * AI extraction".
 *
 * `pendingOnly` defaults to true because that is the Supervisor's actual
 * worklist: FR-PA-02 is a review queue, and a panel that also listed everything
 * already ruled on would bury the three things needing a decision.
 *
 * Unpaginated (`MAX_PAGE_SIZE`) rather than a `DataTable`. A review queue is a
 * small, transient set — the seed holds three — and paging a queue means a
 * Supervisor can finish page 1 believing they are done. If a real plant ever
 * produces more of these than fit on a screen, that is a signal to page it
 * *and* to ask why the extraction is that noisy.
 */
interface UseSuggestionsOptions {
  /** Only what nobody has ruled on yet — the review queue. */
  pendingOnly?: boolean;
  /**
   * Off for a session that cannot act on the answer.
   *
   * `/suggestions` is gated on `action:read`, which an Operator holds — §9.2 and
   * FR-AI-04 both say visibility is not what gets restricted — so the request
   * would succeed. It would simply be a request made on behalf of someone with
   * no button to press, on a screen they open every shift.
   */
  enabled?: boolean;
}

export const useSuggestions = ({
  pendingOnly = true,
  enabled = true,
}: UseSuggestionsOptions = {}) =>
  useQuery({
    queryKey: suggestionKeys.list(pendingOnly),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.SUGGESTIONS.LIST, {
        params: {
          page: 1,
          pageSize: MAX_PAGE_SIZE,
          ...(pendingOnly ? { pending: true } : {}),
        },
      });
      const page = suggestionListResponseSchema.parse(response.data).data;

      return { ...page, items: page.items.map(toSuggestion) };
    },
    enabled,
  });
