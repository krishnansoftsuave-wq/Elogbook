import type { NotificationWire } from "@/features/notifications/schemas";
import { hoursFromBase } from "@/mocks/data/clock";
import { PEOPLE } from "@/mocks/data/people";

/**
 * `state.notifs`, app-source.txt 74–81.
 *
 * Two prototype fields are deliberately **not** in this contract:
 *
 * - `color:'#B7791F'` — a `C`-palette hex sitting in data. Colour is a theme
 *   decision made at render time; a hex on the wire cannot respond to dark mode
 *   and would be the one place the palette escapes `globals.css`.
 * - `icon:'assignment_ind'` — a Material Icons glyph name. This repo uses
 *   `lucide-react`, so a Material name on the wire would be dead weight.
 *
 * Both collapse into `kind`, which the UI maps to a lucide icon and a token.
 *
 * **FR-NOT-01** names four notification triggers: assigned actions, overdue
 * actions, and report or summary availability. Those are the first four kinds
 * below and they are requirement-backed. `comment_added`, `action_completed` and
 * `handover_note` come from the prototype only — flagged rather than presented
 * as requirements.
 */

/**
 * Who each seeded notification belongs to. FR-NOT-01 makes notifications
 * per-user, so a fixture with no addressee could not be rendered correctly by
 * any screen. The Operator gets the action-centric ones, the Supervisor the
 * summary/report ones — which is also what the seeded permission matrix in
 * `admin.ts` grants each of them.
 */
const RECIPIENTS = [
  PEOPLE.OPERATOR,
  PEOPLE.OPERATOR,
  PEOPLE.SUPERVISOR,
  PEOPLE.SUPERVISOR,
  PEOPLE.OPERATOR,
  PEOPLE.OPERATOR,
  PEOPLE.SUPERVISOR,
] as const;

export const seedNotifications = (base: Date): NotificationWire[] => [
  {
    id: "NTF-001",
    recipient_username: RECIPIENTS[0],
    kind: "action_assigned",
    title: "Action assigned to you",
    body: "Inspect valve XV-118 — due today",
    created_at: hoursFromBase(-0.17, base),
    read: false,
    target_type: "action",
    target_id: "ACT-2041",
  },
  {
    id: "NTF-002",
    recipient_username: RECIPIENTS[1],
    kind: "action_overdue",
    title: "Action overdue",
    body: "Replace P-204 seal overdue by 1 day",
    created_at: hoursFromBase(-1, base),
    read: false,
    target_type: "action",
    target_id: "ACT-2038",
  },
  {
    id: "NTF-003",
    recipient_username: RECIPIENTS[2],
    kind: "summary_ready",
    title: "Shift Summary Report ready",
    body: "Day shift summary generated",
    created_at: hoursFromBase(-2, base),
    read: true,
    target_type: "summary",
    target_id: null,
  },
  {
    id: "NTF-004",
    recipient_username: RECIPIENTS[3],
    kind: "report_ready",
    title: "Report ready",
    body: "Trend report (01–10 Jun) is ready",
    created_at: hoursFromBase(-26, base),
    read: true,
    target_type: "report",
    target_id: null,
  },
  {
    id: "NTF-005",
    recipient_username: RECIPIENTS[4],
    kind: "comment_added",
    title: "New comment on ACT-2038",
    body: "A note was added on P-204 vibration",
    created_at: hoursFromBase(-28, base),
    read: true,
    target_type: "action",
    target_id: "ACT-2038",
  },
  {
    id: "NTF-006",
    recipient_username: RECIPIENTS[5],
    kind: "action_completed",
    title: "Action completed",
    body: "ACT-2028 nitrogen purge leak survey closed",
    created_at: hoursFromBase(-50, base),
    read: true,
    target_type: "action",
    target_id: "ACT-2028",
  },
  {
    id: "NTF-007",
    recipient_username: RECIPIENTS[6],
    kind: "handover_note",
    title: "Handover note added",
    body: "Night shift handover ready for review",
    created_at: hoursFromBase(-52, base),
    read: true,
    target_type: "none",
    target_id: null,
  },
];
