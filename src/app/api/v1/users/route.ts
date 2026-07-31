import { matchesSearch, mockRoute, okJson, paginate } from "@/mocks/handler";
import { mockStore } from "@/mocks/store";

/**
 * `GET /api/v1/users` — the admin directory, **FR-ADM-01**.
 *
 * ## The endpoint this build has been missing
 *
 * `API_ENDPOINTS.USERS` has existed since the scaffold and pointed at nothing:
 * `features/users/` is a complete, tested feature whose every hook called a path
 * with no handler. Because `HOME_CANDIDATES` sends anyone holding `user:read`
 * to `/admin/users` first, an Administrator or Super User signing in met a 404
 * toast as the first thing the product ever said to them.
 *
 * ## `user:read`, which now gates something
 *
 * §6.5 says the Super User *"Can view users."*, so reading is not
 * Administrator-only. Until this route existed `user:read` guarded a page shell
 * and no API at all — the UI half of FR-ADM-03 with nothing on the other side.
 *
 * Writing is a different question and a different permission; see
 * `[username]/route.ts`.
 *
 * ## Filtering
 *
 * `role` matches a person holding it **among possibly several** — FR-AUTH-03's
 * multi-role case makes this a contains rather than an equals, and the
 * `maryam.alzadjali` fixture holds two precisely so that path is exercised.
 */
export const GET = mockRoute({ permission: "user:read" }, ({ request }) => {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");
  const status = searchParams.get("status");

  const rows = mockStore()
    .users.filter((user) => {
      if (role && role !== "all" && !user.roles.includes(role)) return false;
      if (status && status !== "all" && user.status !== status) return false;
      return matchesSearch(
        searchParams.get("search"),
        user.username,
        user.display_name
      );
    })
    // By display name — a directory is read by looking somebody up, and
    // insertion order here is the fixture's, which means nothing to a reader.
    .sort((a, b) => a.display_name.localeCompare(b.display_name));

  return okJson(paginate(rows, searchParams));
});
