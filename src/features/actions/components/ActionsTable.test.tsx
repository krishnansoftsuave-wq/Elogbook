import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DEFAULT_PAGE_SIZE } from "@/constants/api";
import { ActionsTable } from "@/features/actions/components/ActionsTable";
import { renderWithProviders } from "@/test/utils";
import {
  installMockApi,
  mockRoute,
  paginatedEnvelope,
  resetMockApi,
} from "@/test/mockApi";

const ACTOR = {
  username: "said.albusaidi",
  display_name: "Said Al-Busaidi",
} as const;

/** Relative to now, so the overdue assertions do not rot. */
const hours = (offset: number) =>
  new Date(Date.now() + offset * 3_600_000)
    .toISOString()
    .replace(/Z$/, "+00:00");

const action = (overrides: Record<string, unknown> = {}) => ({
  id: "ACT-2041",
  title: "Relief valve XV-118 set-pressure verification",
  area: "B-train",
  equipment: "XV-118",
  priority: "critical",
  status: "open",
  source: "ai_suggested",
  category: "safety",
  description: "Confirm set pressure.",
  due_at: hours(24),
  created_at: hours(-24),
  created_by: ACTOR,
  owner: null,
  ...overrides,
});

beforeEach(() => {
  installMockApi();
});

afterEach(() => {
  resetMockApi();
});

describe("ActionsTable", () => {
  it("renders a row per action, through the real Zod boundary", async () => {
    mockRoute("GET", /\/actions$/, () =>
      paginatedEnvelope([
        action(),
        action({
          id: "ACT-2038",
          title: "Lube oil pump P-204 vibration check",
        }),
      ])
    );

    renderWithProviders(<ActionsTable />);

    expect(await screen.findByRole("link", { name: "ACT-2041" })).toBeVisible();
    expect(screen.getByRole("link", { name: "ACT-2038" })).toBeVisible();
    expect(
      screen.getByText("Relief valve XV-118 set-pressure verification")
    ).toBeVisible();
  });

  /**
   * The prototype hangs `onClick` on the `<tr>` (app-source.txt 1212), which no
   * keyboard can reach and no one can open in a new tab. This is the guard.
   */
  it("navigates by a real link, not a row click handler", async () => {
    mockRoute("GET", /\/actions$/, () => paginatedEnvelope([action()]));

    renderWithProviders(<ActionsTable />);

    const link = await screen.findByRole("link", { name: "ACT-2041" });
    expect(link).toHaveAttribute("href", "/actions/ACT-2041");
  });

  it("shows the priority as text, not colour alone", async () => {
    mockRoute("GET", /\/actions$/, () => paginatedEnvelope([action()]));

    renderWithProviders(<ActionsTable />);
    expect(await screen.findByText("Critical")).toBeVisible();
  });

  it("labels the status with the BRD's spelling", async () => {
    mockRoute("GET", /\/actions$/, () =>
      paginatedEnvelope([action({ status: "in_progress" })])
    );

    renderWithProviders(<ActionsTable />);
    expect(await screen.findByText("In Progress")).toBeVisible();
  });

  /** FR-PA-06 — a derived flag beside the due date, not a row tint. */
  it("flags an action past its due date", async () => {
    mockRoute("GET", /\/actions$/, () =>
      paginatedEnvelope([action({ due_at: hours(-2), status: "open" })])
    );

    renderWithProviders(<ActionsTable />);
    expect(await screen.findByText("Overdue")).toBeVisible();
  });

  it("does not flag a completed action with an old due date", async () => {
    mockRoute("GET", /\/actions$/, () =>
      paginatedEnvelope([action({ due_at: hours(-48), status: "completed" })])
    );

    renderWithProviders(<ActionsTable />);
    await screen.findByRole("link", { name: "ACT-2041" });
    expect(screen.queryByText("Overdue")).not.toBeInTheDocument();
  });

  it("shows an empty state when the shift has no actions", async () => {
    mockRoute("GET", /\/actions$/, () => paginatedEnvelope([]));

    renderWithProviders(<ActionsTable />);
    expect(
      await screen.findByText("No pending actions for this shift.")
    ).toBeVisible();
  });

  it("distinguishes 'nothing here' from 'nothing matches your filter'", async () => {
    mockRoute("GET", /\/actions$/, () => paginatedEnvelope([]));

    const user = userEvent.setup();
    renderWithProviders(<ActionsTable />);

    await screen.findByText("No pending actions for this shift.");

    await user.type(screen.getByLabelText("Search actions"), "nothing");

    expect(
      await screen.findByText("No actions match these filters.")
    ).toBeVisible();
  });

  /**
   * Filters live in the query key, so changing one refetches with a request
   * param rather than slicing the rows already on screen.
   *
   * Driven through the overdue checkbox rather than a Select: Base UI renders
   * its listbox in a popup that jsdom cannot lay out, so `role="option"` never
   * appears. The invariant under test is the same either way, and the Selects
   * are exercised for real in `e2e/actions.spec.ts`.
   */
  it("sends a filter to the server rather than slicing locally", async () => {
    const seen: unknown[] = [];
    mockRoute("GET", /\/actions$/, (config) => {
      seen.push(config.params?.overdue);
      return paginatedEnvelope([action()]);
    });

    const user = userEvent.setup();
    renderWithProviders(<ActionsTable />);
    await screen.findByRole("link", { name: "ACT-2041" });

    // First request carries no `overdue` param at all — FR-PA-06's flag is
    // opt-in, not a default.
    expect(seen[0]).toBeUndefined();

    await user.click(screen.getByRole("checkbox", { name: /Overdue only/ }));

    await waitFor(() => expect(seen).toContain(true));
  });

  /**
   * The Area options must come from an unfiltered source. Deriving them from
   * the list response made the control delete its own alternatives: pick
   * "Utilities" and the response — filtered server-side — contained only
   * Utilities, so the dropdown offered only Utilities. FR-HOME-04 asks for
   * browsing "other areas"; that is the control which broke it.
   */
  it("asks for the area options without a filter applied", async () => {
    const requests: Record<string, unknown>[] = [];
    mockRoute("GET", /\/actions$/, (config) => {
      requests.push({ ...(config.params ?? {}) });
      return paginatedEnvelope([
        action({ area: "B-train" }),
        action({ id: "ACT-2004", area: "Utilities" }),
      ]);
    });

    renderWithProviders(<ActionsTable />);
    await screen.findByRole("link", { name: "ACT-2041" });

    await waitFor(() => expect(requests.length).toBeGreaterThanOrEqual(2));

    // The facet query is the unfiltered one asking for more than a page — the
    // list query is also unfiltered at rest, so page size is what tells them
    // apart. Asking beyond one page is the point: an area whose rows all fall
    // on page 2 must still be offerable.
    const facet = requests.filter(
      (params) =>
        params.status === undefined &&
        params.priority === undefined &&
        params.area === undefined &&
        params.search === undefined &&
        Number(params.pageSize) > DEFAULT_PAGE_SIZE
    );

    expect(facet).toHaveLength(1);
  });

  it("labels every filter control", async () => {
    mockRoute("GET", /\/actions$/, () => paginatedEnvelope([action()]));

    renderWithProviders(<ActionsTable />);
    await screen.findByRole("link", { name: "ACT-2041" });

    expect(screen.getByLabelText("Search actions")).toBeVisible();
    expect(screen.getByLabelText("Filter by status")).toBeVisible();
    expect(screen.getByLabelText("Filter by priority")).toBeVisible();
    expect(screen.getByLabelText("Filter by area")).toBeVisible();
  });

  it("reports the server's total, not the number of rows on this page", async () => {
    mockRoute("GET", /\/actions$/, () =>
      paginatedEnvelope([action()], { total: 14, page: 1, pageSize: 10 })
    );

    renderWithProviders(<ActionsTable />);
    await screen.findByRole("link", { name: "ACT-2041" });

    /*
      The exact range, not `/14/`. A bare `14` also matched the due cell whenever
      the rendered time happened to contain it — roughly one minute in fourteen —
      so this test was red for about 7% of the clock.
    */
    expect(screen.getByText(/of 14$/)).toBeVisible();
  });

  it("gives the table an accessible caption", async () => {
    mockRoute("GET", /\/actions$/, () => paginatedEnvelope([action()]));

    renderWithProviders(<ActionsTable />);

    const table = await screen.findByRole("table");
    expect(
      within(table).getByText(/Pending actions, with area, equipment/)
    ).toBeInTheDocument();
  });
});
