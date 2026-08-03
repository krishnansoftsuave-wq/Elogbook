import { ROLES } from "@/constants/roles";
import type { PlatformOverviewWire } from "@/features/platform/schemas";

/**
 * The Super User dashboard's figures — the prototype's `superuser` rows in
 * `logKpiCard` (app-source.txt 759) and `widgetBody` (324, 331, 332).
 *
 * ## ⚠️ Every number here is invented, and the screen says so
 *
 * `features/platform/schemas.ts` records what that means requirement by
 * requirement. Nothing says it on screen — the owner had the equivalent banner
 * deleted from the plant-operations cards, and `PlatformCards.tsx` records why
 * one was not added back here. Two consequences are worth stating where
 * somebody editing the seed will see them:
 *
 * 1. **`users_by_role` does not agree with `/users`.** The mock directory holds
 *    seven people (`mocks/data/users.ts`, seeded from `MOCK_ACCOUNTS`); this
 *    card claims thirty-five. The prototype's figures are kept because the
 *    owner asked these screens to match what was demonstrated, and because
 *    deriving them would have put "Operators 2" on a card whose point is to
 *    look like a plant. `mocks/data/monitoring.ts` already ships the same
 *    disagreement — `active_users_24h: 142` against a seven-row directory — so
 *    this is the established treatment rather than a new one.
 * 2. **`total_roles: 12` is the prototype's role count, not this build's.** The
 *    prototype defines twelve role variants (`ROLES`, 4–33); `constants/roles.ts`
 *    defines five. "9 / 12" is therefore not a ratio anything here could
 *    compute, which is the clearest illustration of why this card needs a
 *    definition from the client before it means anything.
 *
 * A fixed snapshot rather than a moving one, for the reason
 * `mocks/data/monitoring.ts` gives at length: invented numbers that also move
 * read as measurements.
 */
export const seedPlatformOverview = (): PlatformOverviewWire => ({
  /*
    `logKpiCard`'s `superuser` row (759). The first two match the
    Administrator's monitoring screen exactly, because the prototype uses the
    same two figures on both; the last two are the Super User's own.
  */
  audit_events_today: 486,
  active_users_24h: 142,
  provisioned_users: 190,
  custom_dashboards: 7,
  custom_dashboard_roles: 4,
  active_roles: 9,
  total_roles: 12,

  // `widgetBody` case `users` (331), in the prototype's order.
  users_by_role: [
    { role: ROLES.OPERATOR, count: 24 },
    { role: ROLES.SUPERVISOR, count: 6 },
    { role: ROLES.MANAGEMENT, count: 3 },
    { role: ROLES.ADMINISTRATOR, count: 2 },
  ],

  /*
    `widgetBody` case `health` (332).

    ⚠️ **The prototype contradicts itself here and this follows the card it is
    porting.** `monBase()` (355) marks Historian Sync a *warning* on the
    Administrator's monitoring screen, while this card shows the same service
    healthy. Both are reproduced faithfully, so a Super User and an
    Administrator looking at the same platform see different answers. That is a
    prototype defect rather than a porting one, and it should be resolved with
    the client — the fix is one word in one of the two seeds, but which word is
    theirs to choose.
  */
  services: [
    { name: "AD FS / SAML", status: "healthy" },
    { name: "AI service", status: "healthy" },
    { name: "Historian sync", status: "healthy" },
  ],
  /*
    02:00 plant time — the prototype's literal `'02:00'` (332), as an instant so
    the screen formats it rather than trusting the string. The date is arbitrary
    and never rendered; only the time is.
  */
  last_backup_at: "2026-06-24T02:00:00+04:00",

  // `widgetBody` case `compliance` (324).
  compliance_percent: 96,
});
