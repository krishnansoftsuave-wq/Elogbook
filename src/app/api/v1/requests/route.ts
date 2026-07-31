import { WILDCARD_PERMISSION } from "@/constants/permissions";
import { roleLabel } from "@/constants/roles";
import { requestCreateSchema } from "@/features/requests/schemas";
import {
  matchesSearch,
  mockRoute,
  okJson,
  paginate,
  readJson,
} from "@/mocks/handler";
import { mockStore, nextId } from "@/mocks/store";

/**
 * ⚠️ **PROTOTYPE-ONLY — NO BRD BASIS.** This resource appears in no functional
 * requirement, persona flow or scope table of BRD v1.3. Owner decision
 * 2026-07-31: contract only, **no screens**, no FR-ID cited. See
 * `features/requests/schemas.ts` for the full note.
 *
 * The handlers exist so Phase 2 is unblocked the moment OLNG confirms the
 * feature — and so that if the answer is "no", deleting this directory and the
 * feature folder removes it completely.
 *
 * Listing requires the wildcard, because triage is an administrative act and
 * there is no requirement to point at for anything narrower. Creating one is
 * open to any authenticated session, since the whole premise is that a user with
 * insufficient access asks for more.
 */
export const GET = mockRoute(
  { permission: WILDCARD_PERMISSION },
  ({ request }) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const rows = mockStore().requests.filter((entry) => {
      if (status && status !== "all" && entry.status !== status) return false;
      return matchesSearch(
        searchParams.get("search"),
        entry.id,
        entry.subject,
        entry.submitted_by.display_name
      );
    });

    return okJson(paginate(rows, searchParams));
  }
);

export const POST = mockRoute({}, async ({ request, session }) => {
  const body = await readJson(request, requestCreateSchema);
  if (!body.ok) return body.response;

  const entry = {
    id: nextId("REQ"),
    subject: body.data.subject,
    description: body.data.description,
    submitted_by: {
      username: session.username,
      display_name: session.display_name,
    },
    submitted_by_role: session.roles.map(roleLabel).join(" · "),
    submitted_at: new Date().toISOString().replace(/Z$/, "+00:00"),
    status: "in_review" as const,
    remarks: [],
  };

  mockStore().requests.unshift(entry);

  return okJson(entry, 201);
});
