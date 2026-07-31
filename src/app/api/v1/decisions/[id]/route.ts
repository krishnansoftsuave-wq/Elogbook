import { mockRouteWithParams, notFound, okJson } from "@/mocks/handler";
import { findById, mockStore } from "@/mocks/store";

/** `GET /api/v1/decisions/:id` — one decision with its timeline and comments. */
export const GET = mockRouteWithParams<{ id: string }>(
  { permission: "analytics:read" },
  ({ params }) => {
    const decision = findById(mockStore().decisions, params.id);
    if (!decision) return notFound(`Decision ${params.id}`);

    return okJson(decision);
  }
);
