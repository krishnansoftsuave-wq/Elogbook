import { z } from "zod";

import { envelopeSchema, paginatedSchema } from "@/lib/zod";
import { actorSchema, actorWireSchema, toActor } from "@/types/actor";
import { areaSchema, prioritySchema } from "@/types/operations";

/**
 * Management risk decisions.
 *
 * ⚠️ **This entity has no functional-requirement ID.** It is specified only in
 * the persona flows:
 *
 * - **§6.3(a)**, the default — "Where a risk is identified, **record the risk and
 *   the decision for future reference — no workflow is triggered**."
 * - **§6.3(b)**, Admin-enabled — "record an operational decision via a comment
 *   (optionally tagging the concerned person), route to the concerned person,
 *   and track to completion… enabled = full workflow with notification;
 *   disabled = record only."
 *
 * Access to it is gated by **FR-ADM-06** and **FR-DASH-03** ("control access to
 * comments and the decision workflow"). Anything citing an `FR-DEC-*` is citing
 * an ID that does not exist — cite §6.3 and FR-DASH-03 instead.
 *
 * PROVISIONAL field names, from `app-source.txt` 117–120 and 1750–1803.
 */

export const DECISION_STATUS_VALUES = [
  "in_progress",
  "pending_closure",
  "completed",
] as const;

export const decisionStatusSchema = z.enum(DECISION_STATUS_VALUES);
export type DecisionStatus = z.infer<typeof decisionStatusSchema>;

export const DECISION_STATUS_LABEL: Record<DecisionStatus, string> = {
  in_progress: "In Progress",
  pending_closure: "Pending Closure",
  completed: "Completed",
};

/** Replaces the hex in the prototype's timeline tuples (`['#0E8C81', …]`). */
export const DECISION_EVENT_KINDS = [
  "recorded",
  "assigned",
  "status_changed",
  "closed",
] as const;

export const decisionEventKindSchema = z.enum(DECISION_EVENT_KINDS);
export type DecisionEventKind = z.infer<typeof decisionEventKindSchema>;

export const decisionEventWireSchema = z.object({
  kind: decisionEventKindSchema,
  at: z.string(),
  text: z.string(),
  actor: actorWireSchema,
});

export const decisionCommentWireSchema = z.object({
  id: z.string(),
  author: actorWireSchema,
  body: z.string(),
  created_at: z.string(),
});

export const decisionWireSchema = z.object({
  id: z.string(),
  title: z.string(),
  /** The risk the decision accepts or mitigates — §6.3's "record the risk". */
  risk: z.string(),
  area: areaSchema,
  equipment: z.string(),
  priority: prioritySchema,
  detail: z.string(),
  owner: actorWireSchema.nullable(),
  due_at: z.string(),
  status: decisionStatusSchema,
  raised_by: actorWireSchema,
  raised_at: z.string(),
  /** Who §6.3(b)'s workflow notified. Empty while the workflow is disabled. */
  notified: z.array(actorWireSchema),
  timeline: z.array(decisionEventWireSchema),
  comments: z.array(decisionCommentWireSchema),
  /** Present only once closed. */
  closure: z.string().nullable(),
});

export const decisionSchema = z.object({
  id: z.string(),
  title: z.string(),
  risk: z.string(),
  area: z.string(),
  equipment: z.string(),
  priority: prioritySchema,
  detail: z.string(),
  owner: actorSchema.nullable(),
  dueAt: z.string(),
  status: decisionStatusSchema,
  raisedBy: actorSchema,
  raisedAt: z.string(),
  notified: z.array(actorSchema),
  timeline: z.array(
    z.object({
      kind: decisionEventKindSchema,
      at: z.string(),
      text: z.string(),
      actor: actorSchema,
    })
  ),
  comments: z.array(
    z.object({
      id: z.string(),
      author: actorSchema,
      body: z.string(),
      createdAt: z.string(),
    })
  ),
  closure: z.string().nullable(),
});

export type DecisionWire = z.infer<typeof decisionWireSchema>;
export type Decision = z.infer<typeof decisionSchema>;

export const toDecision = (wire: DecisionWire): Decision => ({
  id: wire.id,
  title: wire.title,
  risk: wire.risk,
  area: wire.area,
  equipment: wire.equipment,
  priority: wire.priority,
  detail: wire.detail,
  owner: wire.owner ? toActor(wire.owner) : null,
  dueAt: wire.due_at,
  status: wire.status,
  raisedBy: toActor(wire.raised_by),
  raisedAt: wire.raised_at,
  notified: wire.notified.map(toActor),
  timeline: wire.timeline.map((event) => ({
    kind: event.kind,
    at: event.at,
    text: event.text,
    actor: toActor(event.actor),
  })),
  comments: wire.comments.map((comment) => ({
    id: comment.id,
    author: toActor(comment.author),
    body: comment.body,
    createdAt: comment.created_at,
  })),
  closure: wire.closure,
});

export const decisionListItemWireSchema = decisionWireSchema.omit({
  timeline: true,
  comments: true,
  notified: true,
});

export type DecisionListItemWire = z.infer<typeof decisionListItemWireSchema>;

export const decisionListResponseSchema = envelopeSchema(
  paginatedSchema(decisionListItemWireSchema)
);
export const decisionDetailResponseSchema = envelopeSchema(decisionWireSchema);

/* -------------------------------------------------------------------------- */
/* Requests the client sends                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Recording a decision. Available in both §6.3 modes — recording is the *default*
 * behaviour; only routing and tracking are gated on the workflow toggle.
 */
export const decisionCreateSchema = z.object({
  title: z.string().trim().min(3, "Enter a decision title").max(160),
  risk: z.string().trim().min(3, "Describe the risk").max(160),
  detail: z.string().trim().min(1, "Enter the decision detail").max(4000),
  area: z.string().trim().min(1, "Choose an area"),
  equipment: z.string().trim(),
  priority: prioritySchema,
  due_at: z.string().trim().min(1, "Choose a due date"),
  /**
   * §6.3(b)'s "optionally tagging the concerned person". Rejected with a 403
   * when `management_decision_workflow` is disabled — §6.3(a) is record-only.
   */
  owner_username: z.string().nullable(),
});

export const decisionStatusUpdateSchema = z.object({
  status: decisionStatusSchema,
  closure: z.string().trim().max(4000).nullable().optional(),
});

export const decisionCommentCreateSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Enter a comment")
    .max(2000, "Comment must be 2000 characters or fewer"),
});

export const decisionFiltersSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  search: z.string(),
  status: decisionStatusSchema.or(z.literal("all")),
});
