import { z } from "zod";

import { envelopeSchema, paginatedSchema } from "@/lib/zod";

/**
 * In-app notifications — **FR-NOT-01**, the whole of §7.9.
 *
 * The prototype's `state.notifs` (app-source.txt 74–81) carries two fields that
 * deliberately do not exist here:
 *
 * - `color:'#B7791F'` — a `C`-palette hex in data. Colour is chosen at render
 *   time from a theme token; a hex on the wire cannot respond to dark mode.
 * - `icon:'assignment_ind'` — a Material Icons glyph name. This repo uses
 *   `lucide-react`, so a Material name on the wire would be dead weight.
 *
 * Both collapse into `kind`, which the UI maps to an icon and a token.
 *
 * PROVISIONAL field names. The envelope is not provisional.
 */

/**
 * FR-NOT-01 names four triggers: "assigned actions, overdue actions, and report
 * or summary availability". Those four are requirement-backed. The last three
 * come from the prototype only and are marked as such, so nobody later reports
 * them as FR-NOT-01 coverage.
 */
export const NOTIFICATION_KINDS = [
  /* FR-NOT-01 */
  "action_assigned",
  "action_overdue",
  "summary_ready",
  "report_ready",
  /* Prototype-only — no FR-NOT-01 backing. */
  "comment_added",
  "action_completed",
  "handover_note",
] as const;

export const notificationKindSchema = z.enum(NOTIFICATION_KINDS);
export type NotificationKind = z.infer<typeof notificationKindSchema>;

/** The four FR-NOT-01 names — the Administrator matrix only governs these. */
export const REQUIRED_NOTIFICATION_KINDS = [
  "action_assigned",
  "action_overdue",
  "summary_ready",
  "report_ready",
] as const satisfies readonly NotificationKind[];

export const NOTIFICATION_TARGET_TYPES = [
  "action",
  "summary",
  "report",
  "none",
] as const;

export const notificationTargetTypeSchema = z.enum(NOTIFICATION_TARGET_TYPES);
export type NotificationTargetType = z.infer<
  typeof notificationTargetTypeSchema
>;

export const notificationWireSchema = z.object({
  id: z.string(),
  /**
   * Who this notification is for.
   *
   * **FR-NOT-01 is per-user** — "Allow the Administrator to control, **per
   * user**, which notifications each user is permitted to view / receive" — and
   * without an addressee the contract cannot express that at all. An earlier
   * version omitted it, which made every notification global: one shared tray
   * for the whole plant, and marking one read changed what everyone else saw.
   *
   * The `/admin/notification-permissions` matrix governs *which kinds* a user
   * may receive; this says *whose* a given record is. Both are needed.
   */
  recipient_username: z.string(),
  kind: notificationKindSchema,
  title: z.string(),
  body: z.string(),
  created_at: z.string(),
  read: z.boolean(),
  /** Click-through target; `none` where the prototype had no destination. */
  target_type: notificationTargetTypeSchema,
  target_id: z.string().nullable(),
});

export const notificationSchema = z.object({
  id: z.string(),
  recipientUsername: z.string(),
  kind: notificationKindSchema,
  title: z.string(),
  body: z.string(),
  createdAt: z.string(),
  read: z.boolean(),
  targetType: notificationTargetTypeSchema,
  targetId: z.string().nullable(),
});

export type NotificationWire = z.infer<typeof notificationWireSchema>;
export type Notification = z.infer<typeof notificationSchema>;

export const toNotification = (wire: NotificationWire): Notification => ({
  id: wire.id,
  recipientUsername: wire.recipient_username,
  kind: wire.kind,
  title: wire.title,
  body: wire.body,
  createdAt: wire.created_at,
  read: wire.read,
  targetType: wire.target_type,
  targetId: wire.target_id,
});

export const notificationListResponseSchema = envelopeSchema(
  paginatedSchema(notificationWireSchema)
);
export const notificationDetailResponseSchema = envelopeSchema(
  notificationWireSchema
);

/** `POST /notifications/read-all`'s response — how many rows the write touched. */
export const notificationsMarkAllReadResponseSchema = envelopeSchema(
  z.object({ markedCount: z.number().int().nonnegative() })
);

export const notificationFiltersSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  /** The prototype's tray tabs: everything, or just what is unread. */
  unreadOnly: z.boolean(),
});
