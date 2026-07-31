import { z } from "zod";

import { envelopeSchema, paginatedSchema } from "@/lib/zod";
import { actorSchema, actorWireSchema, toActor } from "@/types/actor";
import {
  actionCategorySchema,
  actionSourceSchema,
  actionStatusSchema,
  areaSchema,
  prioritySchema,
} from "@/types/operations";

/**
 * Pending actions — BRD §7.6.
 *
 * The wire shape is snake_case, matching the only documented contract this repo
 * has (`authentication_flow.md` §5, `GET /me`). `toAction` is the border: a
 * backend field rename lands there and nowhere else.
 *
 * **PROVISIONAL** — these field names are derived from the NYX prototype's mock
 * state (`app-source.txt` 41–54, 87), not from a backend contract, and stand
 * until the real one confirms them. The **envelope** around them is not
 * provisional; §3 admits no bare responses.
 *
 * This file survives cutover. `src/mocks/` does not — it imports these types,
 * never the other way round (the pattern `mocks/shifts/current.ts` established).
 */

export const actionWireSchema = z.object({
  id: z.string(),
  title: z.string(),
  area: areaSchema,
  equipment: z.string(),
  priority: prioritySchema,
  /** FR-PA-04's six states. `Overdue` is derived, never stored — see FR-PA-06. */
  status: actionStatusSchema,
  source: actionSourceSchema,
  category: actionCategorySchema,
  description: z.string(),
  /** ISO-8601 with offset, so FR-PA-06's overdue flag can be computed. */
  due_at: z.string(),
  created_at: z.string(),
  created_by: actorWireSchema,
  /** FR-PA-03 records an owner; FR-PA-05 gates *assigning* one. */
  owner: actorWireSchema.nullable(),
});

export const actionSchema = z.object({
  id: z.string(),
  title: z.string(),
  area: z.string(),
  equipment: z.string(),
  priority: prioritySchema,
  status: actionStatusSchema,
  source: actionSourceSchema,
  category: actionCategorySchema,
  description: z.string(),
  dueAt: z.string(),
  createdAt: z.string(),
  createdBy: actorSchema,
  owner: actorSchema.nullable(),
});

export type ActionWire = z.infer<typeof actionWireSchema>;
export type Action = z.infer<typeof actionSchema>;

export const toAction = (wire: ActionWire): Action => ({
  id: wire.id,
  title: wire.title,
  area: wire.area,
  equipment: wire.equipment,
  priority: wire.priority,
  status: wire.status,
  source: wire.source,
  category: wire.category,
  description: wire.description,
  dueAt: wire.due_at,
  createdAt: wire.created_at,
  createdBy: toActor(wire.created_by),
  owner: wire.owner ? toActor(wire.owner) : null,
});

/* -------------------------------------------------------------------------- */
/* AI-suggested actions — FR-PA-01, FR-PA-02                                   */
/* -------------------------------------------------------------------------- */

export const suggestionWireSchema = z.object({
  id: z.string(),
  title: z.string(),
  reason: z.string(),
  /**
   * Where the AI drew it from, in prose.
   *
   * Modelled on FR-AI-03's source proof but **not** required by it: FR-AI-03 is
   * a §7.4 requirement about assistant *answers*. §7.6 asks for neither a source
   * reference nor a confidence on a suggested action. Both fields come from the
   * prototype and are kept because they are useful — the FR-IDs are not theirs
   * to borrow.
   */
  source_reference: z.string(),
  /** 0–100, from the prototype. See the note above on FR-AI-05. */
  confidence: z.number().min(0).max(100),
  area: areaSchema,
  equipment: z.string(),
  priority: prioritySchema,
  /** Null until a Supervisor decides (FR-PA-02). */
  confirmed: z.boolean().nullable(),
});

export const suggestionSchema = z.object({
  id: z.string(),
  title: z.string(),
  reason: z.string(),
  sourceReference: z.string(),
  confidence: z.number(),
  area: z.string(),
  equipment: z.string(),
  priority: prioritySchema,
  confirmed: z.boolean().nullable(),
});

export type SuggestionWire = z.infer<typeof suggestionWireSchema>;
export type Suggestion = z.infer<typeof suggestionSchema>;

export const toSuggestion = (wire: SuggestionWire): Suggestion => ({
  id: wire.id,
  title: wire.title,
  reason: wire.reason,
  sourceReference: wire.source_reference,
  confidence: wire.confidence,
  area: wire.area,
  equipment: wire.equipment,
  priority: wire.priority,
  confirmed: wire.confirmed,
});

/* -------------------------------------------------------------------------- */
/* Comments                                                                    */
/*                                                                             */
/* Access is Admin-controlled, but FR-SUM-08 is explicitly *"on a shift         */
/* summary"* — it does not reach actions. The closer requirement is FR-ADM-06's */
/* *"control comment & decision-workflow access"*. The prototype's single       */
/* toggle governs both surfaces (app-source.txt 2003); the BRD only legislates  */
/* one. Flagged rather than stretched.                                          */
/* -------------------------------------------------------------------------- */

export const actionCommentWireSchema = z.object({
  id: z.string(),
  action_id: z.string(),
  author: actorWireSchema,
  body: z.string(),
  created_at: z.string(),
});

export const actionCommentSchema = z.object({
  id: z.string(),
  actionId: z.string(),
  author: actorSchema,
  body: z.string(),
  createdAt: z.string(),
});

export type ActionCommentWire = z.infer<typeof actionCommentWireSchema>;
export type ActionComment = z.infer<typeof actionCommentSchema>;

export const toActionComment = (wire: ActionCommentWire): ActionComment => ({
  id: wire.id,
  actionId: wire.action_id,
  author: toActor(wire.author),
  body: wire.body,
  createdAt: wire.created_at,
});

/* -------------------------------------------------------------------------- */
/* Responses                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * `paginatedSchema` is the repo's existing list envelope (`lib/zod.ts`), so its
 * `pageSize` stays camelCase inside an otherwise snake_case body. Reusing the
 * one helper beats inventing a second spelling of pagination — but it is
 * provisional along with everything else here.
 */
export const actionListResponseSchema = envelopeSchema(
  paginatedSchema(actionWireSchema)
);
export const actionDetailResponseSchema = envelopeSchema(actionWireSchema);
export const suggestionListResponseSchema = envelopeSchema(
  paginatedSchema(suggestionWireSchema)
);
export const suggestionDetailResponseSchema =
  envelopeSchema(suggestionWireSchema);
export const actionCommentListResponseSchema = envelopeSchema(
  paginatedSchema(actionCommentWireSchema)
);
export const actionCommentDetailResponseSchema = envelopeSchema(
  actionCommentWireSchema
);

/* -------------------------------------------------------------------------- */
/* Requests the client sends                                                   */
/* -------------------------------------------------------------------------- */

/** FR-PA-04 — the only thing a status change may set. */
export const actionStatusUpdateSchema = z.object({
  status: actionStatusSchema,
});

/**
 * FR-PA-05 — assignment, only when the Administrator has enabled the workflow.
 * `null` un-assigns.
 */
export const actionAssignSchema = z.object({
  owner_username: z.string().nullable(),
});

export const actionCommentCreateSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Enter a comment")
    .max(2000, "Comment must be 2000 characters or fewer"),
});

/** FR-PA-02 — confirm the suggestion into the summary, or reject it. */
export const suggestionConfirmSchema = z.object({
  confirmed: z.boolean(),
  comment: z.string().trim().max(2000).optional(),
});

/**
 * List filters. These live in the query key, never in Zustand — changing one
 * refetches and caches automatically (`features/users/hooks/useUserFilters.ts`).
 */
export const actionFiltersSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  search: z.string(),
  status: actionStatusSchema.or(z.literal("all")),
  priority: prioritySchema.or(z.literal("all")),
  area: z.string(),
  /** FR-PA-06's derived flag, as a filter rather than a stored status. */
  overdueOnly: z.boolean(),
});
