import {
  dashboardLayoutUpdateSchema,
  type DashboardLayoutEntryWire,
} from "@/features/dashboards/schemas";
import { mockRoute, okJson, readJson } from "@/mocks/handler";
import { mockStore } from "@/mocks/store";

/**
 * `/api/v1/me/dashboard-layout` — **FR-DASH-04**'s "save a preferred layout".
 *
 * ## Why it hangs off `/me` rather than `/dashboards`
 *
 * `/dashboards/widgets` is the **standard** every user in a role shares and
 * only a Super User may write. This is one person's arrangement of it. Putting
 * them on the same noun would invite a handler that takes a username parameter,
 * and a username parameter is the thing that lets one user write another's
 * layout — the precise failure **FR-DASH-05** forbids. `/me` cannot express
 * that request: the subject is the bearer token, so a user can only ever read
 * and write their own.
 *
 * No permission gate for the same reason. FR-DASH-04's primary role is "All
 * roles" — arranging your own dashboard is not a privilege, and any
 * authenticated session may do it to their own.
 *
 * Not audited, unlike `ASSIGN_WIDGET` on the Super User's route. §9.3's trail
 * records what changed **for other people**; where somebody put their own cards
 * is not a governance event, and writing one row per drag would drown the log
 * that matters.
 *
 * PROVISIONAL — no backend contract covers this endpoint. The field names come
 * from `features/dashboards/schemas.ts` and are marked the same way.
 */

/**
 * `Object.hasOwn`, not `?? []`.
 *
 * The store's `dashboardLayouts` is an object literal, so it inherits
 * `Object.prototype` — and `username` is unvalidated text from the token, which
 * this mock's own docblock says anyone can forge. A bracket read guarded only by
 * `??` therefore answers for inherited members: a username of `constructor`
 * returned the `Object` function, which `JSON.stringify` drops from the
 * response, so the client received `{ success: true, data: {} }` and its Zod
 * parse threw on a missing `items`.
 *
 * The write side is guarded the same way: assigning to `__proto__` on a plain
 * object reassigns the prototype rather than storing a key, so
 * `Object.defineProperty` is what makes it an ordinary own property.
 */
const layoutFor = (username: string): DashboardLayoutEntryWire[] => {
  const layouts = mockStore().dashboardLayouts;
  return Object.hasOwn(layouts, username) ? (layouts[username] ?? []) : [];
};

export const GET = mockRoute({}, ({ session }) =>
  okJson({ items: layoutFor(session.username) })
);

/**
 * A `PUT` of the whole arrangement rather than a patch of one card: dragging
 * reorders every widget after the drop point, so a per-widget patch would be
 * several requests describing one gesture, and a failure midway would leave a
 * half-applied layout. Replaying this lands the same result (**NFR-12**).
 *
 * An empty `items` array is a legitimate body, not a no-op to guard against —
 * it is exactly what "reset to my role's default" sends.
 */
export const PUT = mockRoute({}, async ({ request, session }) => {
  const body = await readJson(request, dashboardLayoutUpdateSchema);
  if (!body.ok) return body.response;

  // `defineProperty`, not assignment — see `layoutFor`.
  Object.defineProperty(mockStore().dashboardLayouts, session.username, {
    value: [...body.data.items],
    writable: true,
    enumerable: true,
    configurable: true,
  });

  return okJson({ items: layoutFor(session.username) });
});
