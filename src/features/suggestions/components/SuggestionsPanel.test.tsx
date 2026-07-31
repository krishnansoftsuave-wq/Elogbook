import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SuggestionsPanel } from "@/features/suggestions/components/SuggestionsPanel";
import { createTestQueryClient, renderWithProviders } from "@/test/utils";
import {
  envelope,
  installMockApi,
  mockRoute,
  paginatedEnvelope,
  resetMockApi,
} from "@/test/mockApi";

const suggestion = (overrides: Record<string, unknown> = {}) => ({
  id: "AI-118",
  title: "Inspect XV-118 relief valve for passing",
  reason: "Night-shift log records a compressor trip at 02:14.",
  source_reference: "Night-shift log · 10 Jun 02:14",
  confidence: 92,
  area: "B-train",
  equipment: "XV-118",
  priority: "critical",
  confirmed: null,
  ...overrides,
});

/** Every confirm body posted, so a duplicate write would be countable. */
let confirmPosts: Record<string, unknown>[] = [];
let listRequests = 0;

const stubList = (items: readonly unknown[] = [suggestion()]) => {
  mockRoute("GET", /\/suggestions$/, () => {
    listRequests += 1;
    return paginatedEnvelope(items);
  });
};

const stubConfirm = () => {
  mockRoute(
    "POST",
    /\/suggestions\/[^/]+\/confirm$/,
    (config) => {
      const body = JSON.parse(String(config.data ?? "{}"));
      confirmPosts.push(body);
      return envelope(suggestion({ confirmed: body.confirmed }));
    },
    200
  );
};

/** The Supervisor fixture — holds `action:confirm`. */
const asSupervisor = () =>
  installMockApi({
    username: "fatma.alharthy",
    displayName: "Fatma Al-Harthy",
    roles: ["supervisor"],
    permissions: [
      "shift:read",
      "summary:read",
      "summary:comment",
      "action:read",
      "action:write",
      "action:confirm",
      "action:assign",
    ],
  });

beforeEach(() => {
  confirmPosts = [];
  listRequests = 0;
  asSupervisor();
});

afterEach(() => {
  resetMockApi();
});

describe("SuggestionsPanel", () => {
  it("lists what is waiting for a decision", async () => {
    stubList();

    renderWithProviders(<SuggestionsPanel />);

    expect(
      await screen.findByText("Inspect XV-118 relief valve for passing")
    ).toBeVisible();
    expect(screen.getByText("1 pending review")).toBeVisible();
    expect(screen.getByText("92% confidence")).toBeVisible();
  });

  /**
   * §6.2(a) — the boundary the endpoint enforces, stated on screen so a
   * Supervisor is not left to infer that confirming assigns work to somebody.
   */
  it("states that confirming assigns nothing to an operator", async () => {
    stubList();

    renderWithProviders(<SuggestionsPanel />);

    expect(
      await screen.findByText(/No task is assigned to an operator/)
    ).toBeVisible();
  });

  /** **FR-PA-02** — the confirm half. */
  it("confirms a suggestion for the summary", async () => {
    stubList();
    stubConfirm();

    renderWithProviders(<SuggestionsPanel />);
    await screen.findByText("Inspect XV-118 relief valve for passing");

    await userEvent.click(
      screen.getByRole("button", {
        name: "Confirm AI-118 for the shift summary",
      })
    );

    await waitFor(() => expect(confirmPosts).toHaveLength(1));
    expect(confirmPosts[0]).toEqual({ confirmed: true });
  });

  it("carries an optional note onto the confirmation", async () => {
    stubList();
    stubConfirm();

    renderWithProviders(<SuggestionsPanel />);
    await screen.findByText("Inspect XV-118 relief valve for passing");

    await userEvent.click(
      screen.getByRole("button", { name: "Add a note to AI-118" })
    );
    await userEvent.type(
      await screen.findByLabelText("Comment on AI-118"),
      "Coordinate with maintenance."
    );
    await userEvent.click(
      screen.getByRole("button", {
        name: "Confirm AI-118 for the shift summary",
      })
    );

    await waitFor(() => expect(confirmPosts).toHaveLength(1));
    expect(confirmPosts[0]).toEqual({
      confirmed: true,
      comment: "Coordinate with maintenance.",
    });
  });

  /**
   * The BRD gives the Supervisor only a *confirm* verb; the contract carries
   * `{confirmed: false}` and the handler removes any existing confirmation. Both
   * paths exist, and this pins that dismissing sends the negative rather than
   * silently doing nothing.
   */
  it("dismisses a suggestion by sending the negative", async () => {
    stubList();
    stubConfirm();

    renderWithProviders(<SuggestionsPanel />);
    await screen.findByText("Inspect XV-118 relief valve for passing");

    await userEvent.click(
      screen.getByRole("button", { name: "Dismiss AI-118" })
    );

    await waitFor(() => expect(confirmPosts).toHaveLength(1));
    expect(confirmPosts[0]).toEqual({ confirmed: false });
  });

  /**
   * **FR-FB-01** attaches "an optional comment" to *"confirm/reject on
   * AI-suggested pending actions"* — both verbs. An earlier version dropped the
   * note on Dismiss, losing the more useful half: FR-FB-02 classifies feedback
   * into "retrieval miss / wrong citation / unclear answer", none of which a
   * bare `confirmed: false` distinguishes.
   */
  it("carries the note onto a dismissal too", async () => {
    stubList();
    stubConfirm();

    renderWithProviders(<SuggestionsPanel />);
    await screen.findByText("Inspect XV-118 relief valve for passing");

    await userEvent.click(
      screen.getByRole("button", { name: "Add a note to AI-118" })
    );
    await userEvent.type(
      await screen.findByLabelText("Comment on AI-118"),
      "Duplicate of ACT-2038."
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Dismiss AI-118" })
    );

    await waitFor(() => expect(confirmPosts).toHaveLength(1));
    expect(confirmPosts[0]).toEqual({
      confirmed: false,
      comment: "Duplicate of ACT-2038.",
    });
  });

  /**
   * An error is not an empty queue. Collapsing the two made the panel vanish on
   * a 500, so a Supervisor would hand over believing nothing needed confirming —
   * and the global toast that did fire is transient.
   */
  it("says the queue failed to load rather than disappearing", async () => {
    mockRoute("GET", /\/suggestions$/, () => envelope(null), 500);

    // An isolated client with `retry: false`. The app singleton retries once
    // with backoff, which outlasts `findBy*`'s one-second default and would make
    // this look like a missing error state rather than a slow one.
    renderWithProviders(<SuggestionsPanel />, {
      queryClient: createTestQueryClient(),
    });

    expect(
      await screen.findByText(/review queue could not be loaded/)
    ).toBeVisible();
    expect(screen.getByRole("alert")).toBeVisible();
  });

  it("renders nothing at all when the queue is empty", async () => {
    stubList([]);

    const { container } = renderWithProviders(<SuggestionsPanel />);

    await waitFor(() => expect(listRequests).toBe(1));
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  /* ---- FR-ADM-03: permission, not role name ----------------------------- */

  /**
   * The prototype tests `state.role === 'supervisor'` literally, which is why
   * its own four Supervisor sub-roles never see this panel. A permission check
   * has no such blind spot.
   */
  it("renders nothing for a session without action:confirm", async () => {
    resetMockApi();
    installMockApi({
      permissions: [
        "shift:read",
        "summary:read",
        "action:read",
        "action:write",
      ],
    });
    stubList();

    const { container } = renderWithProviders(<SuggestionsPanel />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  /** And it does not even ask — the answer carries no button they could press. */
  it("does not request the queue for a session that cannot act on it", async () => {
    resetMockApi();
    installMockApi({
      permissions: [
        "shift:read",
        "summary:read",
        "action:read",
        "action:write",
      ],
    });
    stubList();

    renderWithProviders(<SuggestionsPanel />);

    await waitFor(() => expect(listRequests).toBe(0));
  });

  /**
   * FR-PA-05's toggle gates *assignment*, not review. §6.2(a) calls
   * confirm-only "the default" — the thing a Supervisor does before an
   * Administrator enables anything — so this panel must appear with the
   * workflow off, which is how it seeds.
   */
  it("appears with the Supervisor Action Workflow switched off", async () => {
    stubList();
    mockRoute("GET", /\/admin\/workflows$/, () =>
      envelope({
        items: [
          {
            key: "supervisor_action_workflow",
            enabled: false,
            affects_role: "supervisor",
          },
        ],
      })
    );

    renderWithProviders(<SuggestionsPanel />);

    expect(
      await screen.findByText("Inspect XV-118 relief valve for passing")
    ).toBeVisible();
  });
});
