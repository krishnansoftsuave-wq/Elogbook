import { z } from "zod";

import { envelopeSchema } from "@/lib/zod";

/**
 * `GET /me` — the wire shape, snake_case exactly as `authentication_flow.md` §5
 * documents it. Nothing else in the app sees these names; `toSessionUser`
 * below is the border.
 *
 * `roles` and `permissions` are both open `string[]` on purpose. §6 lets an
 * Administrator create custom roles through the admin API, so a role or
 * permission this build has never heard of is a valid session, not a malformed
 * response. Validating `roles` against a closed enum would fail the parse and
 * lock that user out of the app entirely until the frontend was redeployed —
 * exactly what BRD §4 says must not be required. §5 is explicit that
 * permissions, not role names, are the authorization unit, so nothing is
 * weakened by keeping this open: `roles` is display-only here.
 */
export const meDataSchema = z.object({
  subject: z.string(),
  username: z.string(),
  display_name: z.string(),
  roles: z.array(z.string()),
  groups: z.array(z.string()),
  permissions: z.array(z.string()),
  /** `null` means full-plant access; a list scopes the user to those areas. */
  area_scope: z.array(z.string()).nullable(),
});

export const meResponseSchema = envelopeSchema(meDataSchema);

/**
 * `POST /dev/token` — §4. Stub-mode only: this endpoint 404s the moment real
 * AD FS is wired in (tracker A-01), which is the intended cutover signal.
 */
export const devTokenRequestSchema = z.object({
  username: z.string().trim().min(1, "Enter a username"),
  groups: z.array(z.string()).min(1, "Choose at least one AD group"),
  display_name: z.string().optional(),
});

export const devTokenDataSchema = z.object({
  access_token: z.string(),
  token_type: z.literal("Bearer"),
  /** Seconds, not milliseconds — 900 (15 minutes) in stub mode today. */
  expires_in: z.number().int().positive(),
});

export const devTokenResponseSchema = envelopeSchema(devTokenDataSchema);

/**
 * The camelCase session the app renders and gates on. `roles` mirrors the wire
 * as an open `string[]` — see `meDataSchema` above. Consumers must treat a role
 * name as an opaque label and look it up defensively (`ROLE_LABEL[r] ?? r`),
 * never index a `Record<Role, …>` with it unguarded.
 */
export const sessionUserSchema = z.object({
  subject: z.string(),
  username: z.string(),
  displayName: z.string(),
  roles: z.array(z.string()),
  groups: z.array(z.string()),
  permissions: z.array(z.string()),
  areaScope: z.array(z.string()).nullable(),
});

/**
 * Wire → app. This function is the single place a backend field rename lands:
 * change the right-hand side here and nothing else in the app moves.
 */
export const toSessionUser = (
  data: z.infer<typeof meDataSchema>
): z.infer<typeof sessionUserSchema> => ({
  subject: data.subject,
  username: data.username,
  displayName: data.display_name,
  roles: data.roles,
  groups: data.groups,
  permissions: data.permissions,
  areaScope: data.area_scope,
});
