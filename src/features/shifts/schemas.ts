import { z } from "zod";

import { envelopeSchema } from "@/lib/zod";

/**
 * `GET /api/v1/shifts/current` — `authentication_flow.md` §7, snake_case
 * exactly as the contract documents it.
 *
 * It lives here rather than in `features/auth/` because it is not an auth
 * endpoint: §7 documents it as the worked example of a *permission-gated*
 * resource (`shift:read`), which is what makes it the endpoint that exercises
 * §3's 403 branch. The auth flow is what guards it, not what it returns.
 *
 * `label` is an open string, not an enum. The contract shows `"Day"` and the
 * shift model is Administrator-configurable (**FR-HOME-03**: "shift boundaries
 * configurable. The Administrator can change shift timings"), so a deployment
 * that renames or adds a shift must not fail the parse and lock the screen out.
 */
export const currentShiftDataSchema = z.object({
  /** `YYYYMMDD-<D|N>`, e.g. `20260730-D`. */
  shift_id: z.string(),
  label: z.string(),
  /** ISO-8601 with an explicit offset, per §3's `meta.timestamp` spelling. */
  starts_at: z.string(),
  ends_at: z.string(),
  /** The 06:00–06:15 handover window, in minutes (**FR-HOME-03**). */
  overlap_minutes: z.number().int().nonnegative(),
});

export const currentShiftResponseSchema = envelopeSchema(
  currentShiftDataSchema
);

export type CurrentShiftData = z.infer<typeof currentShiftDataSchema>;

/**
 * The same shift in the spelling the rest of the app uses.
 *
 * The wire schema above stays snake_case because §7 documents it that way and a
 * contract document is worth matching literally. Components are camelCase like
 * every other feature, so the boundary gets a mapper rather than a screen full
 * of `shift.overlap_minutes`.
 */
export const currentShiftSchema = z.object({
  shiftId: z.string(),
  label: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  overlapMinutes: z.number().int().nonnegative(),
});

export type CurrentShift = z.infer<typeof currentShiftSchema>;

export const toCurrentShift = (wire: CurrentShiftData): CurrentShift => ({
  shiftId: wire.shift_id,
  label: wire.label,
  startsAt: wire.starts_at,
  endsAt: wire.ends_at,
  overlapMinutes: wire.overlap_minutes,
});
