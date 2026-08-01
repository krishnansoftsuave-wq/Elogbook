import { z } from "zod";

import {
  notificationKindSchema,
  notificationTargetTypeSchema,
  type NotificationWire,
} from "@/features/notifications/schemas";
import { hoursFromBase } from "@/mocks/data/clock";
import notificationFixtures from "@/mocks/data/notifications.json";
import { PEOPLE } from "@/mocks/data/people";

// Row content lives in notifications.json; this resolves hoursAgo against the seed instant and recipient against a real directory account. `kind` (not colour/icon) carries the meaning — the UI maps that to a lucide icon and a token.

// Object.keys(PEOPLE) spelled as a literal tuple — validates the JSON fixture's recipient field without an `as` cast (banned project-wide).
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
