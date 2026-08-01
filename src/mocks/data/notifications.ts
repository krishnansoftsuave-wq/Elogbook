import { z } from "zod";

import {
  notificationKindSchema,
  notificationTargetTypeSchema,
  type NotificationWire,
} from "@/features/notifications/schemas";
import { hoursFromBase } from "@/mocks/data/clock";
import notificationFixtures from "@/mocks/data/notifications.json";
import { PEOPLE } from "@/mocks/data/people";

/**
 * `state.notifs`, app-source.txt 74–81. The row content lives in
 * `notifications.json`, not here — this only resolves each row's relative
 * `hoursAgo` against the store's seed instant and its `recipient` key against
 * a real directory account, the same two things `hoursFromBase` and `PEOPLE`
 * exist to do for every other fixture in this folder.
 *
 * Two prototype fields are deliberately **not** in the wire contract:
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
 * actions, and report or summary availability. The fixtures for those four
 * kinds are requirement-backed. `comment_added`, `action_completed` and
 * `handover_note` come from the prototype only — flagged rather than presented
 * as requirements.
 *
 * Recipients: the Operator gets the action-centric rows, the Supervisor the
 * summary/report ones — which is also what the seeded permission matrix in
 * `admin.ts` grants each of them.
 */

/**
 * `Object.keys(PEOPLE)` spelled as a literal tuple, matching
 * `people.test.ts`'s pin of that exact list — the least indirect way to
 * validate a JSON fixture's `recipient` field is one of `PEOPLE`'s keys
 * without an `as` cast (banned project-wide, see `eslint.config.mjs`).
 */
const notificationFixtureSchema = z.object({
  id: z.string(),
  recipient: z.enum([
    "OPERATOR",
    "SUPERVISOR",
    "MANAGEMENT",
    "ADMINISTRATOR",
    "SUPER_USER",
    "MULTI_ROLE",
  ]),
  kind: notificationKindSchema,
  title: z.string(),
  body: z.string(),
  /** Hours before the store's seed instant. `hoursFromBase` wants negative. */
  hoursAgo: z.number(),
  read: z.boolean(),
  targetType: notificationTargetTypeSchema,
  targetId: z.string().nullable(),
});

const FIXTURES = z.array(notificationFixtureSchema).parse(notificationFixtures);

export const seedNotifications = (base: Date): NotificationWire[] =>
  FIXTURES.map((fixture) => ({
    id: fixture.id,
    recipient_username: PEOPLE[fixture.recipient],
    kind: fixture.kind,
    title: fixture.title,
    body: fixture.body,
    created_at: hoursFromBase(-fixture.hoursAgo, base),
    read: fixture.read,
    target_type: fixture.targetType,
    target_id: fixture.targetId,
  }));
