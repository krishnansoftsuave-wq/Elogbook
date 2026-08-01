import { z } from "zod";

import { envelopeSchema, paginatedSchema } from "@/lib/zod";
import { actorSchema, actorWireSchema, toActor } from "@/types/actor";

/**
 * The audit trail — §7.11.
 *
 * **FR-ADM-05** — "Capture a full audit trail: sign-ins, approvals, AI
 * questions, exports, and settings changes."
 * **FR-REP-06** — "Record every report export in the audit trail."
 * **FR-OBS-01** — LLM interactions go to "immutable, append-only" storage.
 * **§9.3** governs the audit trail itself.
 *
 * The shape is derived from the six columns `audit()` renders (`app-source.txt`
 * 1645–1659) — Timestamp, User, Role, Action, Target, Result — because the
 * prototype holds those rows as a literal inside the render method rather than
 * as a `state` entity.
 *
 * **There is no update or delete in this contract, and that is the point.** The
 * immutability guarantee itself is **[BACKEND]** — an array in a Node process
 * proves nothing about storage — but the frontend must never be written as
 * though editing an audit row were possible.
 *
 * PROVISIONAL field names.
 */

/**
 * The verbs, and **each one has to name what actually happened.**
 *
 * §9.3 makes this store append-only, so a mislabelled row is permanent. That
 * principle was already recorded twice below (`UPDATE_USER_ACCESS`,
 * `ASSISTANT_FEEDBACK`); Phase 3b applied it to the seven handlers that were
 * still borrowing a neighbour's verb, because the audit *screen* is what makes
 * the drift visible. Before it, filtering `UPDATE_ROLE` would have returned
 * widget assignments and request resolutions, and filtering `VIEW_ACTION` would
 * have returned comment posts.
 *
 * Two members are deliberately never emitted, and both stay because this
 * list is the **contract**, not an inventory of what this build happens to do:
 *
 * - `LOGOUT` — there is no logout endpoint (`authentication_flow.md` §9: auth is
 *   stateless, and logout is the frontend discarding a token). Emitting it would
 *   let a browser write to an append-only store on its own say-so.
 * - `EXPORT_REPORT` — no export endpoint exists at all, so **FR-REP-06** is
 *   reported unmet rather than faked.
 *
 * `UPDATE_ROLE` was a third, left with no emitter by Phase 3b: every handler
 * that used it was borrowing it (`ASSIGN_WIDGET`, `RESOLVE_REQUEST`,
 * `UPDATE_USER_ACCESS` each took over one case), and roles come from AD
 * (**FR-AUTH-02**), so nothing in that build could change one. `PUT
 * /admin/roles/:id` now emits it for real — for a **custom** role only; a
 * base role stays AD's, and its own write path 409s before this verb is ever
 * reached.
 */
export const AUDIT_ACTIONS = [
  /** Emitted by `POST /dev/token`, success and failure — FR-ADM-05, §9.3. */
  "LOGIN",
  /** In the contract; nothing emits it. See above. */
  "LOGOUT",
  "VIEW_ACTION",
  "COMMENT_ACTION",
  "UPDATE_ACTION_STATUS",
  /** FR-PA-03. Assigning an owner is not a status change. */
  "ASSIGN_ACTION",
  "ACCEPT_AI_ACTION",
  "REJECT_AI_ACTION",
  "GENERATE_SUMMARY",
  /** FR-SUM-08. Commenting on a summary does not generate one. */
  "COMMENT_SUMMARY",
  /** In the contract; no export endpoint exists. FR-REP-06 reported unmet. */
  "EXPORT_REPORT",
  "RECORD_DECISION",
  "COMMENT_DECISION",
  "UPDATE_ROLE",
  /** §6 / FR-ADM-02 — an Administrator creating a custom role. */
  "CREATE_ROLE",
  /** §6 / FR-ADM-02 — an Administrator deleting a custom role. */
  "DELETE_ROLE",
  /** FR-ADM-06 / FR-DASH-02 — a widget assigned to a role is not a role change. */
  "ASSIGN_WIDGET",
  /** ⚠️ PROTOTYPE-ONLY, like `/requests` itself — no BRD basis. */
  "RESOLVE_REQUEST",
  /**
   * FR-ADM-01's suspend / reinstate. A distinct action rather than reusing
   * `UPDATE_ROLE`, for the reason recorded on `ASSISTANT_FEEDBACK` below: §9.3
   * requires an immutable record of **what actually happened**, and this write
   * cannot change a role — roles come from AD (FR-AUTH-02) and
   * `userAccessUpdateSchema` rejects the field. An audit row saying somebody's
   * role was updated when their platform access was suspended is a record of an
   * event that did not occur.
   */
  "UPDATE_USER_ACCESS",
  "UPDATE_WORKFLOW",
  /** FR-HOME-03. Shift timings are not a workflow switch. */
  "UPDATE_SHIFT_CONFIG",
  "UPDATE_NOTIFICATION_PERMISSION",
  "ASSISTANT_QUERY",
  /**
   * FR-FB-01's capture. A distinct action rather than reusing
   * `ASSISTANT_QUERY`: §9.3 requires an immutable record of what actually
   * happened, and an audit row that calls a thumbs-down a query is a record of
   * something that did not occur.
   */
  "ASSISTANT_FEEDBACK",
  "RETENTION_PURGE",
  /**
   * ⚠️ PROTOTYPE-ONLY, like `/dashboard-builder` itself — no BRD basis. The
   * draft half of the prototype's `dashboards()` builder flow
   * (`features/dashboard-builder/schemas.ts`).
   */
  "SAVE_DASHBOARD_DRAFT",
  /** ⚠️ PROTOTYPE-ONLY — publishing a per-role dashboard config. */
  "PUBLISH_DASHBOARD",
  /** ⚠️ PROTOTYPE-ONLY — reverting a per-role dashboard to a prior version. */
  "RESTORE_DASHBOARD_VERSION",
] as const;

export const auditActionSchema = z.enum(AUDIT_ACTIONS);
export type AuditAction = z.infer<typeof auditActionSchema>;

export const AUDIT_RESULTS = ["success", "failure"] as const;
export const auditResultSchema = z.enum(AUDIT_RESULTS);
export type AuditResult = z.infer<typeof auditResultSchema>;

export const auditEventWireSchema = z.object({
  id: z.string(),
  occurred_at: z.string(),
  /** Null for a system-originated event — the prototype's "System / —" row. */
  actor: actorWireSchema.nullable(),
  role_label: z.string(),
  action: auditActionSchema,
  target: z.string(),
  result: auditResultSchema,
});

export const auditEventSchema = z.object({
  id: z.string(),
  occurredAt: z.string(),
  actor: actorSchema.nullable(),
  roleLabel: z.string(),
  action: auditActionSchema,
  target: z.string(),
  result: auditResultSchema,
});

export type AuditEventWire = z.infer<typeof auditEventWireSchema>;
export type AuditEvent = z.infer<typeof auditEventSchema>;

export const toAuditEvent = (wire: AuditEventWire): AuditEvent => ({
  id: wire.id,
  occurredAt: wire.occurred_at,
  actor: wire.actor ? toActor(wire.actor) : null,
  roleLabel: wire.role_label,
  action: wire.action,
  target: wire.target,
  result: wire.result,
});

export const auditListResponseSchema = envelopeSchema(
  paginatedSchema(auditEventWireSchema)
);

/**
 * The prototype's three filter chips — User, Action, Date (`app-source.txt`
 * 1650) — plus free text.
 *
 * Two fields are new in Phase 3b, and both were gaps rather than additions:
 * `search` the handler had always honoured while the schema never declared it,
 * and `from`/`to` neither side supported even though the prototype draws a Date
 * chip. `"all"` is the sentinel for both selects, matching every other filter
 * schema in the repo.
 *
 * `from`/`to` are plant-local calendar dates (`YYYY-MM-DD`), inclusive at both
 * ends — the handler converts each row's instant to the plant's day before
 * comparing, so a night shift's late entries land on the day it worked.
 */
export const auditFiltersSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  search: z.string(),
  username: z.string(),
  action: auditActionSchema.or(z.literal("all")),
  from: z.string(),
  to: z.string(),
});
