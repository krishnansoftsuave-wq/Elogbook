import { mockRouteWithParams, notFound, okJson } from "@/mocks/handler";
import { findById, mockStore } from "@/mocks/store";

/**
 * `GET /api/v1/summaries/:id` — one summary with its four FR-SUM-01 sections,
 * its comments, and the FR-PA-02 confirmations folded into it.
 */
export const GET = mockRouteWithParams<{ id: string }>(
  { permission: "summary:read" },
  ({ params }) => {
    const summary = findById(mockStore().summaries, params.id);
    if (!summary) return notFound(`Summary ${params.id}`);

    return okJson(summary);
  }
);
