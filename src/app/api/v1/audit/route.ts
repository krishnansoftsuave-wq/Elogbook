import { WILDCARD_PERMISSION } from "@/constants/permissions";
import { matchesSearch, mockRoute, okJson, paginate } from "@/mocks/handler";
import { mockStore } from "@/mocks/store";

/**
 * The plant-local calendar day an instant falls on, as `YYYY-MM-DD`.
 *
 * The `from` / `to` inputs are dates a person picked off a calendar, and the
 * calendar they were looking at is the plant's — `Asia/Muscat`, which the whole
 * app renders in. Comparing the instant's UTC date instead would put everything
 * an Omani night shift did between 20:00 and midnight on the wrong day.
 *
 * `en-CA` because it formats as `YYYY-MM-DD`, which is exactly the spelling an
 * `<input type="date">` submits, so the comparison is a string compare with no
 * parsing on either side.
 */
const PLANT_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Muscat",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const plantDayOf = (occurredAt: string): string => {
  const parsed = Date.parse(occurredAt);
  return Number.isNaN(parsed) ? "" : PLANT_DAY.format(parsed);
};

/**
 * `GET /api/v1/audit` — §7.11, §9.3.
 *
 * **There is deliberately no POST, PUT, PATCH or DELETE on this route.**
 * FR-OBS-01 requires "immutable, append-only" audit storage, and the only way
 * into this collection is `recordAudit`, called server-side by the handlers that
 * actually change something. The immutability guarantee itself is **[BACKEND]**
 * — an array in a Node process proves nothing — but the frontend can never be
 * written as though editing an audit row were possible, because no endpoint
 * exists to try.
 *
 * Newest first: an audit log is read from the top.
 *
 * Filters mirror the prototype's three chips (`app-source.txt` 1650) — User,
 * Action, Date — plus a free-text search. `from` / `to` are **PROVISIONAL**
 * param names on the same terms as `/summaries`', and inclusive at both ends,
 * because a person picking the same date twice means "that day".
 */
export const GET = mockRoute(
  { permission: WILDCARD_PERMISSION },
  ({ request }) => {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const username = searchParams.get("username");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const rows = mockStore()
      .auditEvents.filter((event) => {
        if (action && action !== "all" && event.action !== action) return false;
        if (
          username &&
          username !== "all" &&
          event.actor?.username !== username
        )
          return false;

        if (from || to) {
          const day = plantDayOf(event.occurred_at);
          if (from && day < from) return false;
          if (to && day > to) return false;
        }

        return matchesSearch(
          searchParams.get("search"),
          event.action,
          event.target,
          event.actor?.display_name ?? "System"
        );
      })
      .slice()
      .reverse();

    return okJson(paginate(rows, searchParams));
  }
);
