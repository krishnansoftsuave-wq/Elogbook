import { summaryGenerateSchema } from "@/features/summaries/schemas";
import {
  matchesSearch,
  mockRoute,
  okJson,
  paginate,
  readJson,
} from "@/mocks/handler";
import { currentShift } from "@/mocks/shifts/current";
import { latestSummaryFirst, mockStore, recordAudit } from "@/mocks/store";

/**
 * A `YYYY-MM-DD` query param reduced to the `YYYYMMDD` spelling `shift_date`
 * uses, or `null` when absent or malformed.
 *
 * Both forms are fixed-width and zero-padded, so once the separators are gone a
 * plain string comparison orders dates correctly and no parsing is involved —
 * which also means no timezone can shift the boundary by a day. `YYYY-MM-DD` is
 * what `<input type="date">` submits.
 *
 * A malformed value is ignored rather than rejected, matching how `matchesSearch`
 * treats a missing `search`. The UI cannot produce one; only a hand-built request
 * can, and refusing the whole list over it would be a harsher answer than the
 * rest of this contract gives.
 */
const dateBound = (raw: string | null): string | null => {
  if (!raw) return null;
  const digits = raw.replaceAll("-", "");
  return /^\d{8}$/.test(digits) ? digits : null;
};

/**
 * `GET /api/v1/summaries` — the shift-summary list, §7.5.
 *
 * The list omits `sections`, `comments` and `ai_confirmations`: a summary body
 * is four sections of prose, and shipping fourteen of them to render a table is
 * waste. `summaryListItemWireSchema` is the shape this returns.
 *
 * **`from` / `to` are PROVISIONAL**, on the same terms as every field name here.
 * They exist because **FR-HOME-04** — "Allow browsing of previous shifts, dates,
 * and other areas" — is a High-priority requirement that nothing else in the
 * contract answers, and the prototype's own date chip (app-source 1377) is
 * decoration with no handler behind it. The *requirement* is quoted; the param
 * spelling is the guess, and correcting it is an edit to this function and the
 * filters hook.
 *
 * Both bounds are inclusive.
 *
 * **Ordered newest-first, by `generated_at` descending.** This is a contract
 * promise, not an artefact of the seed order, and the distinction was a live
 * bug: `useLatestSummary` reads `items[0]` of a one-row page to find the newest
 * summary, and with no sort here that was simply whichever record happened to
 * sit at index 0 of the store. `POST /summaries` prepends a summary whose shift
 * is unseen, so generating one for an *older* shift moved it to the front and
 * silently repointed every dashboard widget at a months-old shift.
 *
 * **There is no `area` param, and the reason is the schema rather than a
 * policy.** A summary has no area: `summaryWireSchema` carries a shift, not a
 * location, because a shift summary covers the whole plant by construction.
 * FR-HOME-04's "other areas" is therefore not answerable on this resource at
 * all — `/actions` is where an area filter exists and belongs. (An earlier note
 * here cited §9.2 as having "removed area filtering"; that is a misreading —
 * §9.2 scopes its statement to *AI answers*, and §6.2 keeps area first-class as
 * Administrator-configured data scope.)
 */
export const GET = mockRoute({ permission: "summary:read" }, ({ request }) => {
  const { searchParams } = new URL(request.url);
  const from = dateBound(searchParams.get("from"));
  const to = dateBound(searchParams.get("to"));

  const rows = mockStore()
    .summaries.filter(
      (summary) =>
        matchesSearch(
          searchParams.get("search"),
          summary.id,
          summary.name,
          summary.generated_by.display_name
        ) &&
        (!from || summary.shift_date >= from) &&
        (!to || summary.shift_date <= to)
    )
    .map(({ sections, comments, ai_confirmations, ...listItem }) => {
      // Destructured away deliberately — see the note above.
      void sections;
      void comments;
      void ai_confirmations;
      return listItem;
    })
    // Latest shift first, by the shift the summary *describes* rather than by
    // `generated_at` — FR-SUM-02 allows generating on demand for any shift, so
    // ordering by when somebody pressed the button would float a five-year-old
    // shift to the top. `latestSummaryFirst` is shared with the confirmation
    // handler and documents why the D/N half of `shift_id` is not compared.
    .sort(latestSummaryFirst);

  return okJson(paginate(rows, searchParams));
});

/**
 * `POST /api/v1/summaries` — FR-SUM-02's on-demand generation.
 *
 * **FR-SUM-04 is why there is no approval step anywhere here**: "Allow **any
 * authorised user to create a summary without a mandatory approval gate**".
 * `summary:read` is therefore the only permission required — every operational
 * role holds it, and adding a stricter gate would invent a requirement the BRD
 * explicitly rules out.
 *
 * The generated body reuses the newest summary's sections. Inventing distinct
 * plant activity per shift would be fabricating operational history; the real
 * content comes from the RAG pipeline (**[BACKEND]**, FR-SUM-03: "Infer summary
 * facts from written entries").
 *
 * **Idempotent per shift (NFR-12).** A summary's id is derived from its shift,
 * so generating twice for the same shift must not mint a second record —
 * "no lost updates or **duplicate records**". It previously did: the seed
 * already contains `SUM-<today>-D`, so the very first on-demand generation
 * created a colliding id, and `findById` (a `.find()`) then permanently shadowed
 * the seeded summary along with its comments and confirmations.
 *
 * Regenerating now *replaces* the shift's summary in place and answers `200`;
 * only a genuinely new shift answers `201`. That is also the truthful reading of
 * FR-SUM-02 — a shift has one summary, and asking again re-generates it.
 */
export const POST = mockRoute(
  { permission: "summary:read" },
  async ({ request, session }) => {
    const body = await readJson(request, summaryGenerateSchema);
    if (!body.ok) return body.response;

    const store = mockStore();
    const template = store.summaries[0];
    // FR-HOME-03: "report/summary generation aligns to" the configured timings.
    const shift = currentShift(new Date(), store.shiftConfig);
    const generatedAt = new Date().toISOString().replace(/Z$/, "+00:00");

    const id = `SUM-${body.data.shift_id}`;
    const existingIndex = store.summaries.findIndex(
      (candidate) => candidate.id === id
    );
    const existing = store.summaries[existingIndex];

    const summary = {
      id,
      shift_id: body.data.shift_id,
      name: `${shift.label} Shift – on demand`,
      window_label: `${shift.label} (${shift.starts_at.slice(11, 16)}–${shift.ends_at.slice(11, 16)})`,
      shift_date: body.data.shift_id.split("-")[0] ?? shift.shift_id,
      generated_at: generatedAt,
      generated_by: {
        username: session.username,
        display_name: session.display_name,
      },
      generated_by_role: session.roles[0] ?? "",
      generation: "on_demand" as const,
      sections: template ? structuredClone(template.sections) : [],
      // Regenerating the narrative must not discard the human record attached to
      // it. FR-SUM-08's comments and FR-PA-02's confirmations are decisions
      // people made; the AI-written sections are the only part being redone.
      comments: existing ? existing.comments : [],
      ai_confirmations: existing ? existing.ai_confirmations : [],
    };

    if (existing) {
      store.summaries[existingIndex] = summary;
    } else {
      store.summaries.unshift(summary);
    }

    recordAudit(session, "GENERATE_SUMMARY", summary.id);

    return okJson(summary, existing ? 200 : 201);
  }
);
