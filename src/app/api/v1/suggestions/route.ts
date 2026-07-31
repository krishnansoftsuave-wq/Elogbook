import { mockRoute, okJson, paginate } from "@/mocks/handler";
import { mockStore } from "@/mocks/store";

/**
 * `GET /api/v1/suggestions` — AI-extracted candidate actions.
 *
 * **FR-PA-01** — actions are captured "by a mix of manual tagging and automatic
 * AI extraction". These are the extracted half, waiting for the Supervisor
 * review FR-PA-02 describes.
 *
 * Gated on `action:read` rather than `action:confirm`: an Operator may *see*
 * what the AI proposed on their plant, they simply cannot act on it. FR-AI-04
 * and §9.2 point the same way — visibility is not the thing being restricted.
 *
 * `?pending=true` returns only what nobody has ruled on yet, which is the
 * Supervisor's actual worklist.
 */
export const GET = mockRoute({ permission: "action:read" }, ({ request }) => {
  const { searchParams } = new URL(request.url);
  const pendingOnly = searchParams.get("pending") === "true";

  const items = pendingOnly
    ? mockStore().suggestions.filter(
        (suggestion) => suggestion.confirmed === null
      )
    : mockStore().suggestions;

  return okJson(paginate(items, searchParams));
});
