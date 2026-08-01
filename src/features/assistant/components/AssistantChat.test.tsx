import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

/*
  Mocked at the module boundary so both surfaces are countable: the component's
  own `toast.success` and the global `MutationCache.onError` in
  `lib/query-client.ts` import from here.
*/
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { AssistantChat } from "@/features/assistant/components/AssistantChat";
import { renderWithProviders } from "@/test/utils";
import {
  envelope,
  installMockApi,
  mockRoute,
  resetMockApi,
} from "@/test/mockApi";

const answer = (overrides: Record<string, unknown> = {}) => ({
  id: "ASK-0001",
  question: "What happened on B-train last night?",
  answer:
    "B-train experienced a compressor trip at 02:14 and was restarted at 02:31.",
  language: "en",
  confidence: 92,
  low_confidence: false,
  citations: [
    {
      record_id: "ELB-20260731-0042",
      label: "Night-shift log",
      shift_id: "20260731-N",
      occurred_at: "2026-07-31T14:05:00+00:00",
      target_type: "log_entry",
      target_id: "ELB-20260731-0042",
    },
    {
      record_id: "ACT-2041",
      label: "Relief valve XV-118 verification",
      shift_id: "20260731-D",
      occurred_at: "2026-07-31T14:05:00+00:00",
      target_type: "action",
      target_id: "ACT-2041",
    },
  ],
  created_at: "2026-07-31T14:05:00+00:00",
  ...overrides,
});

/** Captures what the composer actually posted. */
let lastQuery: Record<string, unknown> = {};
let lastFeedback: Record<string, unknown> = {};
/** Every feedback body, so duplicate writes are countable (NFR-12). */
let feedbackPosts: Record<string, unknown>[] = [];

const stubQuery = (overrides: Record<string, unknown> = {}, status = 200) => {
  mockRoute(
    "POST",
    /\/assistant\/query$/,
    (config) => {
      lastQuery = JSON.parse(String(config.data ?? "{}"));
      return envelope(answer(overrides));
    },
    status
  );
};

const stubFeedback = () => {
  mockRoute(
    "POST",
    /\/assistant\/feedback$/,
    (config) => {
      lastFeedback = JSON.parse(String(config.data ?? "{}"));
      feedbackPosts.push(lastFeedback);
      return envelope({
        id: "FB-0001",
        answer_id: "ASK-0001",
        rating: "down",
        comment: "",
        citation_record_id: null,
        submitted_by: "said.albusaidi",
        submitted_at: "2026-07-31T14:06:00+00:00",
      });
    },
    201
  );
};

const ask = async (question: string) => {
  await userEvent.type(screen.getByLabelText("Ask the assistant"), question);
  await userEvent.click(screen.getByRole("button", { name: "Send question" }));
};

beforeEach(() => {
  lastQuery = {};
  lastFeedback = {};
  feedbackPosts = [];
  vi.mocked(toast.error).mockClear();
  vi.mocked(toast.success).mockClear();
  installMockApi();
});

afterEach(() => {
  resetMockApi();
});

describe("AssistantChat", () => {
  it("starts empty rather than with a fabricated conversation", () => {
    renderWithProviders(<AssistantChat />);

    // The prototype seeds a two-bubble example exchange it never wrote to state
    // (app-source.txt 1325-1326); a fake prior conversation is not a real one.
    expect(screen.getByText("No questions yet")).toBeVisible();
    expect(screen.queryByText(/compressor trip/)).not.toBeInTheDocument();
  });

  it("asks a question and renders the answer through the real Zod boundary", async () => {
    stubQuery();

    renderWithProviders(<AssistantChat />);
    await ask("What happened on B-train last night?");

    expect(await screen.findByText(/compressor trip at 02:14/)).toBeVisible();
    expect(
      screen.getByText("What happened on B-train last night?")
    ).toBeVisible();
  });

  /**
   * **FR-AI-03** — "Show source proof — shift date, timestamp (GST), record ID —
   * with click-through to the original entry."
   */
  it("shows each citation's record id, shift date and GST timestamp", async () => {
    stubQuery();

    renderWithProviders(<AssistantChat />);
    await ask("What happened on B-train?");

    await screen.findByText(/compressor trip/);
    // 14:05 UTC is 18:05 GST.
    expect(
      screen.getByText(/ELB-20260731-0042 · 31 Jul 2026 · 18:05 GST/)
    ).toBeVisible();
  });

  it("links a citation that this platform hosts", async () => {
    stubQuery();

    renderWithProviders(<AssistantChat />);
    await ask("What happened on B-train?");

    const link = await screen.findByRole("link", {
      name: "Relief valve XV-118 verification",
    });
    expect(link).toHaveAttribute("href", "/actions/ACT-2041");
  });

  /**
   * A `log_entry` lives in the source E-Logbook, which this platform reads and
   * does not host (FR-DATA-01). A dead link would look like a working one.
   */
  it("renders a source-system citation as text, and says why", async () => {
    stubQuery();

    renderWithProviders(<AssistantChat />);
    await ask("What happened on B-train?");

    await screen.findByText(/compressor trip/);
    expect(
      screen.queryByRole("link", { name: "Night-shift log" })
    ).not.toBeInTheDocument();
    expect(screen.getByText(/source system — not held here/)).toBeVisible();
  });

  /** **FR-AI-05** — "State clearly when confidence is low." */
  it("warns above the answer when the server flags low confidence", async () => {
    stubQuery({ confidence: 24, low_confidence: true });

    renderWithProviders(<AssistantChat />);
    await ask("Something unmatched");

    expect(
      await screen.findByText(/Confidence in this answer is low/)
    ).toBeVisible();
  });

  it("does not warn when confidence is high", async () => {
    stubQuery();

    renderWithProviders(<AssistantChat />);
    await ask("What happened on B-train?");

    await screen.findByText(/compressor trip/);
    expect(
      screen.queryByText(/Confidence in this answer is low/)
    ).not.toBeInTheDocument();
  });

  /**
   * **NFR-07** — the answer's `dir` comes from the server's `language`, not from
   * re-sniffing the text. A reply that comes back in a different language than
   * it was asked in still renders correctly.
   */
  it("renders an Arabic answer right-to-left", async () => {
    stubQuery({
      language: "ar",
      answer: "يوجد حاليًا ثلاثة إجراءات معلّقة.",
    });

    renderWithProviders(<AssistantChat />);
    await ask("ما الذي حدث؟");

    const text = await screen.findByText("يوجد حاليًا ثلاثة إجراءات معلّقة.");
    const card = text.closest("[dir]");
    expect(card).toHaveAttribute("dir", "rtl");
    expect(card).toHaveAttribute("lang", "ar");
    // The sources label swaps too, as the prototype does (app-source.txt 1338).
    expect(screen.getByText("المصادر")).toBeVisible();
  });

  it("renders an English answer left-to-right", async () => {
    stubQuery();

    renderWithProviders(<AssistantChat />);
    await ask("What happened on B-train?");

    const text = await screen.findByText(/compressor trip/);
    expect(text.closest("[dir]")).toHaveAttribute("dir", "ltr");
  });

  /**
   * A failure stays visible under the question that caused it. A toast would
   * vanish and leave an unanswered question on screen with no explanation.
   */
  it("replaces the pending turn with an error, under its own question", async () => {
    stubQuery({}, 500);

    renderWithProviders(<AssistantChat />);
    await ask("What happened on B-train?");

    expect(await screen.findByText("What happened on B-train?")).toBeVisible();
    // The placeholder is gone — the error took its place rather than sitting
    // beside a transcript that still looks like it is loading.
    await waitFor(() =>
      expect(
        screen.queryByText("Waiting for an answer")
      ).not.toBeInTheDocument()
    );
    expect(screen.getByRole("alert")).toBeVisible();
  });

  /**
   * The transcript is the error surface, so the global mutation toast is opted
   * out of via `meta: { suppressErrorToast: true }`.
   *
   * Without it the user sees the same sentence twice: `query-client.ts:23` skips
   * the global toast only when `mutation.options.onError` is set, and a per-call
   * `mutate(_, { onError })` callback — which is how the error turn is written —
   * lives on the observer, not on `mutation.options`.
   *
   * Asserted at the `sonner` boundary rather than by counting rendered toasts,
   * because `renderWithProviders` mounts no `<Toaster/>` to count.
   */
  it("does not also toast a failed question", async () => {
    stubQuery({}, 500);

    renderWithProviders(<AssistantChat />);
    await ask("What happened on B-train?");

    await screen.findByRole("alert");
    expect(toast.error).not.toHaveBeenCalled();
  });

  /** The contrast: feedback has no inline surface, so it *should* toast. */
  it("does toast a failed feedback submission", async () => {
    stubQuery();
    mockRoute("POST", /\/assistant\/feedback$/, () => envelope(null), 500);

    renderWithProviders(<AssistantChat />);
    await ask("What happened on B-train?");
    await screen.findByText(/compressor trip/);

    await userEvent.click(
      screen.getByRole("button", { name: "Rate this answer helpful" })
    );

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  /**
   * The composer validates against the same schema the endpoint parses, so an
   * over-long question keeps its text and shows the schema's own message rather
   * than being cleared into a generic server error.
   */
  it("refuses an over-long question without destroying it", async () => {
    stubQuery();

    renderWithProviders(<AssistantChat />);
    const input = screen.getByLabelText("Ask the assistant");
    await userEvent.click(input);
    await userEvent.paste("x".repeat(1001));
    await userEvent.click(
      screen.getByRole("button", { name: "Send question" })
    );

    expect(
      await screen.findByText("Question must be 1000 characters or fewer")
    ).toBeVisible();
    expect(input).toHaveValue("x".repeat(1001));
    expect(lastQuery).toEqual({});
  });

  /** **FR-AI-06** — the user's own filters, sent only when set. */
  it("sends only the filters the user filled in", async () => {
    stubQuery();

    renderWithProviders(<AssistantChat />);
    await userEvent.click(screen.getByRole("button", { name: /Filters/ }));
    await userEvent.type(screen.getByLabelText("Equipment"), "XV-118");
    await ask("What happened?");

    await waitFor(() => expect(lastQuery.question).toBe("What happened?"));
    expect(lastQuery.equipment).toBe("XV-118");
    expect(lastQuery).not.toHaveProperty("area");
    expect(lastQuery).not.toHaveProperty("author");
  });

  /**
   * **FR-AI-04** — "Do not restrict answers by area; all operational users may
   * query all units." The session's own scope must never be injected.
   */
  it("never injects an area restriction of its own", async () => {
    stubQuery();

    renderWithProviders(<AssistantChat />);
    await ask("What happened?");

    await waitFor(() => expect(lastQuery.question).toBe("What happened?"));
    expect(lastQuery).not.toHaveProperty("area");
    expect(lastQuery).not.toHaveProperty("area_scope");
  });

  /* ---- FR-FB-01 --------------------------------------------------------- */

  it("submits a thumbs-up against the answer", async () => {
    stubQuery();
    stubFeedback();

    renderWithProviders(<AssistantChat />);
    await ask("What happened on B-train?");
    await screen.findByText(/compressor trip/);

    await userEvent.click(
      screen.getByRole("button", { name: "Rate this answer helpful" })
    );

    await waitFor(() => expect(lastFeedback.rating).toBe("up"));
    expect(lastFeedback.answer_id).toBe("ASK-0001");
    expect(lastFeedback).not.toHaveProperty("citation_record_id");
  });

  /**
   * FR-FB-02 classifies feedback into "retrieval miss / wrong citation /
   * unclear answer" — none of which a bare down-vote distinguishes, so the
   * comment box is offered on a thumbs-down and not on a thumbs-up.
   */
  it("asks what was wrong after a thumbs-down", async () => {
    stubQuery();
    stubFeedback();

    renderWithProviders(<AssistantChat />);
    await ask("What happened on B-train?");
    await screen.findByText(/compressor trip/);

    await userEvent.click(
      screen.getByRole("button", { name: "Rate this answer not helpful" })
    );

    expect(
      await screen.findByLabelText("What was wrong with this answer?")
    ).toBeVisible();
  });

  /**
   * **NFR-12** — "no duplicate records". One user act is one record.
   *
   * A first version posted the down-vote on click *and* again when the comment
   * was sent, so "👎, here's why" wrote two rows and two audit events, and
   * FR-FB-02's ranked backlog would have counted one complaint twice.
   */
  it("writes exactly one record for a thumbs-down with a comment", async () => {
    stubQuery();
    stubFeedback();

    renderWithProviders(<AssistantChat />);
    await ask("What happened on B-train?");
    await screen.findByText(/compressor trip/);

    await userEvent.click(
      screen.getByRole("button", { name: "Rate this answer not helpful" })
    );
    await userEvent.type(
      await screen.findByLabelText("What was wrong with this answer?"),
      "Wrong train."
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Send feedback" })
    );

    await waitFor(() => expect(feedbackPosts).toHaveLength(1));
    expect(feedbackPosts[0]).toMatchObject({
      rating: "down",
      comment: "Wrong train.",
    });
  });

  it("writes exactly one record for a thumbs-down with no comment", async () => {
    stubQuery();
    stubFeedback();

    renderWithProviders(<AssistantChat />);
    await ask("What happened on B-train?");
    await screen.findByText(/compressor trip/);

    await userEvent.click(
      screen.getByRole("button", { name: "Rate this answer not helpful" })
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Skip the comment" })
    );

    await waitFor(() => expect(feedbackPosts).toHaveLength(1));
    expect(feedbackPosts[0]).not.toHaveProperty("comment");
  });

  /** Clicking twice must not write twice. */
  it("accepts only one rating per answer", async () => {
    stubQuery();
    stubFeedback();

    renderWithProviders(<AssistantChat />);
    await ask("What happened on B-train?");
    await screen.findByText(/compressor trip/);

    const up = screen.getByRole("button", { name: "Rate this answer helpful" });
    await userEvent.click(up);
    await waitFor(() => expect(feedbackPosts).toHaveLength(1));

    // Both controls lock once the answer has been rated.
    expect(up).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Rate this answer not helpful" })
    ).toBeDisabled();
    expect(feedbackPosts).toHaveLength(1);
  });

  /**
   * The rating buttons hold state, so it must be exposed — otherwise the only
   * confirmation is a toast that disappears, and the visual state is colour
   * alone (WCAG 1.4.1).
   */
  it("exposes which rating was given, and does not mark the other one", async () => {
    stubQuery();
    stubFeedback();

    renderWithProviders(<AssistantChat />);
    await ask("What happened on B-train?");
    await screen.findByText(/compressor trip/);

    const up = screen.getByRole("button", { name: "Rate this answer helpful" });
    const down = screen.getByRole("button", {
      name: "Rate this answer not helpful",
    });
    expect(up).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(up);

    await waitFor(() => expect(up).toHaveAttribute("aria-pressed", "true"));
    expect(down).toHaveAttribute("aria-pressed", "false");
  });

  it("does not ask for a comment after a thumbs-up", async () => {
    stubQuery();
    stubFeedback();

    renderWithProviders(<AssistantChat />);
    await ask("What happened on B-train?");
    await screen.findByText(/compressor trip/);

    await userEvent.click(
      screen.getByRole("button", { name: "Rate this answer helpful" })
    );

    await waitFor(() => expect(lastFeedback.rating).toBe("up"));
    expect(
      screen.queryByLabelText("What was wrong with this answer?")
    ).not.toBeInTheDocument();
  });

  /**
   * FR-FB-01 is feedback on answers **and citations**. A citation-scoped report
   * carries the record id, which is what makes it a "wrong citation" finding
   * rather than a general complaint.
   */
  it("reports one citation as wrong, scoped to its record id", async () => {
    stubQuery();
    stubFeedback();

    renderWithProviders(<AssistantChat />);
    await ask("What happened on B-train?");
    await screen.findByText(/compressor trip/);

    await userEvent.click(
      screen.getByRole("button", {
        name: "Report ACT-2041 as an incorrect source",
      })
    );

    await waitFor(() =>
      expect(lastFeedback.citation_record_id).toBe("ACT-2041")
    );
    expect(lastFeedback.rating).toBe("down");
  });

  /* ---- FR-AI-01 voice: present, disabled, explained ---------------------- */

  it("shows the voice control disabled with the reason", async () => {
    renderWithProviders(<AssistantChat />);

    const mic = screen.getByRole("button", {
      name: /Voice input needs an on-premises speech-to-text service/,
    });
    expect(mic).toBeDisabled();
  });

  /* ---- seeded from the top bar's search field ---------------------------- */

  /**
   * `/assistant?q=…` is how `components/layout/HeaderSearch.tsx` hands a
   * question over. The page awaits `searchParams` and passes it down, so by the
   * time this component sees it there is no URL parsing left to do.
   */
  describe("seeded from ?q=", () => {
    it("asks the question the top bar handed over", async () => {
      stubQuery();

      renderWithProviders(<AssistantChat initialQuestion="compressor trip" />);

      await waitFor(() => expect(lastQuery.question).toBe("compressor trip"));
      expect(screen.getByText("compressor trip")).toBeVisible();
    });

    it("stays empty when no question came with the navigation", () => {
      stubQuery();

      renderWithProviders(<AssistantChat initialQuestion="   " />);

      expect(screen.getByText("No questions yet")).toBeVisible();
      expect(lastQuery.question).toBeUndefined();
    });

    /**
     * Searching again from the assistant screen re-renders the route in place
     * rather than remounting, so a "have I run" boolean would latch after the
     * first question and silently drop every one after it. The guard is the seed
     * value, which is what makes this pass.
     */
    it("asks again when a different question arrives", async () => {
      stubQuery();

      const { rerender } = renderWithProviders(
        <AssistantChat initialQuestion="compressor trip" />
      );
      await waitFor(() => expect(lastQuery.question).toBe("compressor trip"));

      rerender(<AssistantChat initialQuestion="relief valve" />);

      await waitFor(() => expect(lastQuery.question).toBe("relief valve"));
      expect(screen.getByText("compressor trip")).toBeVisible();
    });

    it("does not re-ask the same question on a re-render", async () => {
      stubQuery();

      const { rerender } = renderWithProviders(
        <AssistantChat initialQuestion="compressor trip" />
      );
      await waitFor(() => expect(lastQuery.question).toBe("compressor trip"));

      rerender(<AssistantChat initialQuestion="compressor trip" />);

      await waitFor(() =>
        expect(screen.getAllByText("compressor trip")).toHaveLength(1)
      );
    });
  });
});
