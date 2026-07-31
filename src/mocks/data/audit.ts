import type { AuditEventWire } from "@/features/audit/schemas";
import { hoursFromBase } from "@/mocks/data/clock";
import { actor, PEOPLE } from "@/mocks/data/people";

/**
 * The audit log, from `audit()` (app-source.txt 1645–1659). Its rows are a
 * literal inside the render method rather than a `state` entity, so the shape
 * here is derived from the six columns the table renders: Timestamp, User, Role,
 * Action, Target, Result.
 *
 * **FR-ADM-05** — "Capture a full audit trail: sign-ins, approvals, AI
 * questions, exports, and settings changes."
 * **FR-OBS-01** — LLM interactions go to "immutable, append-only" storage.
 * **FR-REP-06** — "Record every report export in the audit trail."
 *
 * Append-only is the property that matters and it is enforced at the store, not
 * here: `appendAuditEvent` is the only mutation, and there is deliberately no
 * update or delete. The real immutability guarantee is **[BACKEND]** — a mock
 * array in a Node process proves nothing about storage. What this does prove is
 * that the frontend never asks to edit one.
 *
 * PROVISIONAL field names.
 */

export const seedAuditEvents = (base: Date): AuditEventWire[] => [
  {
    id: "AUD-0001",
    occurred_at: hoursFromBase(-6, base),
    actor: actor(PEOPLE.SUPERVISOR),
    role_label: "Supervisor",
    action: "LOGIN",
    target: "AD FS / OAuth 2.0",
    result: "success",
  },
  {
    id: "AUD-0002",
    occurred_at: hoursFromBase(-5.5, base),
    actor: actor(PEOPLE.SUPERVISOR),
    role_label: "Supervisor",
    action: "ACCEPT_AI_ACTION",
    target: "AI-118",
    result: "success",
  },
  {
    id: "AUD-0003",
    occurred_at: hoursFromBase(-5, base),
    actor: actor(PEOPLE.MANAGEMENT),
    role_label: "Management",
    action: "EXPORT_REPORT",
    target: "Shift Summary PDF",
    result: "success",
  },
  {
    id: "AUD-0004",
    occurred_at: hoursFromBase(-4, base),
    actor: actor(PEOPLE.OPERATOR),
    role_label: "Operator",
    action: "VIEW_ACTION",
    target: "ACT-2041",
    result: "success",
  },
  {
    id: "AUD-0005",
    occurred_at: hoursFromBase(-3, base),
    actor: actor(PEOPLE.MULTI_ROLE),
    role_label: "Operator · Management",
    action: "ASSISTANT_QUERY",
    target: "B-train night shift summary",
    result: "success",
  },
  {
    id: "AUD-0006",
    occurred_at: hoursFromBase(-2, base),
    actor: actor(PEOPLE.ADMINISTRATOR),
    role_label: "Administrator",
    action: "UPDATE_WORKFLOW",
    target: "supervisor_action_workflow",
    result: "success",
  },
  {
    id: "AUD-0007",
    occurred_at: hoursFromBase(-1, base),
    actor: null,
    /*
      An em dash, not "System". The prototype's own row reads `System | —`
      (`app-source.txt` 1647) — "System" is what the *User* column says when
      there is no actor, and the table renders that from `actor: null`. Putting
      it here too printed "System" twice across two columns, which is how the
      duplication was found.
    */
    role_label: "—",
    action: "RETENTION_PURGE",
    target: "Logs older than retention policy",
    result: "success",
  },
];
