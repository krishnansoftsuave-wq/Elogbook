import { z } from "zod";

import { envelopeSchema, paginatedSchema } from "@/lib/zod";
import { actorSchema, actorWireSchema, toActor } from "@/types/actor";

/**
 * User access / support requests.
 *
 * ⚠️⚠️ **PROTOTYPE-ONLY — NO BRD BASIS.**
 *
 * This entity appears in **no** functional requirement, **no** persona flow (§6)
 * and **no** scope table (§3) of BRD v1.3. That was searched for, not assumed.
 * It exists in the delivered prototype (`app-source.txt` 61–72, screens
 * 1519–1555 and 1825) and nowhere else.
 *
 * Owner decision, 2026-07-31: **defer**. The contract is written so Phase 2 is
 * unblocked the moment OLNG confirms the feature, but **no screen is built**.
 * Do not cite an FR-ID for anything here — there is none to cite, and
 * `.claude/rules/08` forbids inventing one. If this ships without confirmation,
 * it is a feature delivered against no requirement on a fixed-bid engagement.
 *
 * PROVISIONAL in every sense: field names, and whether the entity should exist.
 */

export const REQUEST_STATUS_VALUES = [
  "in_review",
  "resolved",
  "rejected",
] as const;

export const requestStatusSchema = z.enum(REQUEST_STATUS_VALUES);
export type RequestStatus = z.infer<typeof requestStatusSchema>;

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  in_review: "In Review",
  resolved: "Resolved",
  rejected: "Rejected",
};

export const requestRemarkWireSchema = z.object({
  id: z.string(),
  author: actorWireSchema,
  body: z.string(),
  created_at: z.string(),
});

export const requestWireSchema = z.object({
  id: z.string(),
  subject: z.string(),
  description: z.string(),
  submitted_by: actorWireSchema,
  /** Display-only role label at submission time. */
  submitted_by_role: z.string(),
  submitted_at: z.string(),
  status: requestStatusSchema,
  remarks: z.array(requestRemarkWireSchema),
});

export const supportRequestSchema = z.object({
  id: z.string(),
  subject: z.string(),
  description: z.string(),
  submittedBy: actorSchema,
  submittedByRole: z.string(),
  submittedAt: z.string(),
  status: requestStatusSchema,
  remarks: z.array(
    z.object({
      id: z.string(),
      author: actorSchema,
      body: z.string(),
      createdAt: z.string(),
    })
  ),
});

export type RequestWire = z.infer<typeof requestWireSchema>;
export type SupportRequest = z.infer<typeof supportRequestSchema>;

export const toSupportRequest = (wire: RequestWire): SupportRequest => ({
  id: wire.id,
  subject: wire.subject,
  description: wire.description,
  submittedBy: toActor(wire.submitted_by),
  submittedByRole: wire.submitted_by_role,
  submittedAt: wire.submitted_at,
  status: wire.status,
  remarks: wire.remarks.map((remark) => ({
    id: remark.id,
    author: toActor(remark.author),
    body: remark.body,
    createdAt: remark.created_at,
  })),
});

export const requestListResponseSchema = envelopeSchema(
  paginatedSchema(requestWireSchema)
);
export const requestDetailResponseSchema = envelopeSchema(requestWireSchema);

export const requestCreateSchema = z.object({
  subject: z.string().trim().min(3, "Enter a subject").max(160),
  description: z.string().trim().min(1, "Describe your request").max(4000),
});

export const requestResolveSchema = z.object({
  status: requestStatusSchema,
  remark: z.string().trim().max(2000).optional(),
});

export const requestFiltersSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  search: z.string(),
  status: requestStatusSchema.or(z.literal("all")),
});
