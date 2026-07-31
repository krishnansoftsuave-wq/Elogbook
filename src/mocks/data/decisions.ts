import type { DecisionWire } from "@/features/decisions/schemas";
import { daysFromBase, hoursFromBase } from "@/mocks/data/clock";
import { actor, PEOPLE } from "@/mocks/data/people";

/**
 * `state.decisions`, app-source.txt 117–120 — the Management risk-decision
 * record.
 *
 * **This entity has no FR-ID.** It is specified only in the persona flows: §6.3
 * *"Where a risk is identified, record the risk and the decision for future
 * reference — no workflow is triggered"* (the default), and §6.3(b) *"record an
 * operational decision via a comment (optionally tagging the concerned person),
 * route to the concerned person, and track to completion"* (Admin-enabled).
 * FR-ADM-06 and FR-DASH-03 gate access to it. Anything citing an `FR-DEC-*` is
 * citing an ID that does not exist.
 *
 * The prototype seeds three decisions that all have owners, timelines and
 * notification lists — i.e. the §6.3(b) variant. The workflow toggle seeds
 * **off** (see `admin.ts`), so `notified` is the record of who *was* told when
 * the workflow last ran; the notify step itself is gated on the mutation.
 *
 * Hex dropped from the prototype's timeline tuples (`['#0E8C81', …]`) in favour
 * of `kind`, same reasoning as `notifications.ts`.
 *
 * PROVISIONAL field names.
 */

export const seedDecisions = (base: Date): DecisionWire[] => [
  {
    id: "DEC-014",
    title: "Defer B-train SDV swap to next turnaround",
    risk: "P-204 bearing degradation",
    area: "B-train",
    equipment: "P-204",
    priority: "high",
    detail:
      "Vibration on P-204 is trending toward the trip threshold but remains within safe operating limits. Risk accepted to continue operation with enhanced vibration monitoring; the SDV swap is deferred to the next planned turnaround.",
    owner: actor(PEOPLE.OPERATOR),
    due_at: daysFromBase(9, base),
    status: "in_progress",
    raised_by: actor(PEOPLE.MANAGEMENT),
    raised_at: daysFromBase(-3, base),
    notified: [actor(PEOPLE.OPERATOR), actor(PEOPLE.ADMINISTRATOR)],
    timeline: [
      {
        kind: "recorded",
        at: daysFromBase(-3, base),
        text: "Decision recorded",
        actor: actor(PEOPLE.MANAGEMENT),
      },
      {
        kind: "assigned",
        at: hoursFromBase(-71, base),
        text: "Owner assigned to Said Al-Busaidi",
        actor: actor(PEOPLE.MANAGEMENT),
      },
      {
        kind: "status_changed",
        at: daysFromBase(-2, base),
        text: "Status moved to In Progress",
        actor: actor(PEOPLE.OPERATOR),
      },
    ],
    comments: [
      {
        id: "DCM-001",
        author: actor(PEOPLE.OPERATOR),
        body: "Daily vibration readings are being logged; will flag immediately if the trend accelerates.",
        created_at: daysFromBase(-2, base),
      },
    ],
    closure: null,
  },
  {
    id: "DEC-013",
    title: "Continue operation on single lube-oil pump P-204",
    risk: "Lube-oil pump redundancy loss",
    area: "B-train",
    equipment: "P-204",
    priority: "high",
    detail:
      "Standby lube-oil pump is out for repair. Risk accepted to continue on the running pump with a spare on order; revert to full redundancy on arrival of the spare.",
    owner: actor(PEOPLE.MULTI_ROLE),
    due_at: daysFromBase(5, base),
    status: "pending_closure",
    raised_by: actor(PEOPLE.MANAGEMENT),
    raised_at: daysFromBase(-5, base),
    notified: [actor(PEOPLE.MULTI_ROLE)],
    timeline: [
      {
        kind: "recorded",
        at: daysFromBase(-5, base),
        text: "Decision recorded",
        actor: actor(PEOPLE.MANAGEMENT),
      },
      {
        kind: "status_changed",
        at: hoursFromBase(-116, base),
        text: "Status moved to In Progress",
        actor: actor(PEOPLE.MULTI_ROLE),
      },
      {
        kind: "status_changed",
        at: daysFromBase(-1, base),
        text: "Spare received — moved to Pending Closure",
        actor: actor(PEOPLE.MULTI_ROLE),
      },
    ],
    comments: [
      {
        id: "DCM-002",
        author: actor(PEOPLE.MULTI_ROLE),
        body: "Spare pump received and installed; awaiting Management closure confirmation.",
        created_at: daysFromBase(-1, base),
      },
    ],
    closure: null,
  },
  {
    id: "DEC-012",
    title: "Approve flare permit extension for C-101 restart",
    risk: "Flare permit expiry",
    area: "Utilities",
    equipment: "—",
    priority: "low",
    detail:
      "HSSE-reviewed extension of the flaring permit to cover the planned C-101 restart window.",
    owner: actor(PEOPLE.ADMINISTRATOR),
    due_at: daysFromBase(-1, base),
    status: "completed",
    raised_by: actor(PEOPLE.SUPER_USER),
    raised_at: daysFromBase(-8, base),
    notified: [actor(PEOPLE.ADMINISTRATOR)],
    timeline: [
      {
        kind: "recorded",
        at: daysFromBase(-8, base),
        text: "Decision recorded",
        actor: actor(PEOPLE.SUPER_USER),
      },
      {
        kind: "status_changed",
        at: hoursFromBase(-189, base),
        text: "Status moved to In Progress",
        actor: actor(PEOPLE.ADMINISTRATOR),
      },
      {
        kind: "closed",
        at: daysFromBase(-3, base),
        text: "Closure confirmed",
        actor: actor(PEOPLE.SUPER_USER),
      },
    ],
    comments: [
      {
        id: "DCM-003",
        author: actor(PEOPLE.ADMINISTRATOR),
        body: "Permit extension issued and filed.",
        created_at: daysFromBase(-3, base),
      },
    ],
    closure:
      "Permit extension issued, documented and filed with HSSE. No outstanding risk.",
  },
];
