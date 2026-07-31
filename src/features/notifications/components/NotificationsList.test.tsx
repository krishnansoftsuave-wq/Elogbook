import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { NotificationsList } from "@/features/notifications/components/NotificationsList";
import { NotificationsTray } from "@/features/notifications/components/NotificationsTray";
import { createTestQueryClient, renderWithProviders } from "@/test/utils";
import {
  envelope,
  installMockApi,
  mockRoute,
  paginatedEnvelope,
  resetMockApi,
} from "@/test/mockApi";

const notification = (overrides: Record<string, unknown> = {}) => ({
  id: "NTF-001",
  recipient_username: "said.albusaidi",
  kind: "action_assigned",
  title: "Action assigned to you",
  body: "Inspect valve XV-118 — due today",
  created_at: "2026-07-31T10:45:00+00:00",
  read: false,
  target_type: "action",
  target_id: "ACT-2041",
  ...overrides,
});

let lastQuery: Record<string, unknown> = {};
let readPosts: string[] = [];

const stubList = (
  items: readonly unknown[] = [notification()],
  total?: number
) => {
  mockRoute("GET", /\/notifications$/, (config) => {
    lastQuery = (config.params ?? {}) as Record<string, unknown>;
    return paginatedEnvelope(items, { total: total ?? items.length });
  });
};

const stubMarkRead = () => {
  mockRoute(
    "POST",
    /\/notifications\/([^/]+)\/read$/,
    (config) => {
      readPosts.push(String(config.url ?? ""));
      return envelope(notification({ read: true }));
    },
    200
  );
};

beforeEach(() => {
  lastQuery = {};
  readPosts = [];
  installMockApi();
});

afterEach(() => {
  resetMockApi();
});

describe("NotificationsList", () => {
  it("lists notifications through the real Zod boundary", async () => {
    stubList();

    renderWithProviders(<NotificationsList />);

    expect(await screen.findByText("Action assigned to you")).toBeVisible();
    expect(screen.getByText("Inspect valve XV-118 — due today")).toBeVisible();
    // 10:45 UTC is 14:45 GST — plant time, not the runner's.
    expect(screen.getByText("31 Jul, 14:45")).toBeVisible();
  });

  /** Click-through to the record the notification is about. */
  it("links an action notification to its action", async () => {
    stubList();

    renderWithProviders(<NotificationsList />);

    const link = await screen.findByRole("link", {
      name: /Action assigned to you/,
    });
    expect(link).toHaveAttribute("href", "/actions/ACT-2041");
  });

  it("links a summary notification to its summary", async () => {
    stubList([
      notification({
        id: "NTF-002",
        kind: "summary_ready",
        title: "Shift summary ready",
        target_type: "summary",
        target_id: "SUM-20260731-D",
      }),
    ]);

    renderWithProviders(<NotificationsList />);

    expect(
      await screen.findByRole("link", { name: /Shift summary ready/ })
    ).toHaveAttribute("href", "/summaries/SUM-20260731-D");
  });

  /**
   * Reports are §7.8 and belong to Phase 4. A link to a route that does not
   * exist would 404 into the app's own not-found page, which reads as breakage
   * rather than "not built yet".
   */
  it("does not link a notification whose target this build has no screen for", async () => {
    stubList([
      notification({
        id: "NTF-003",
        kind: "report_ready",
        title: "Monthly report ready",
        target_type: "report",
        target_id: "REP-001",
      }),
    ]);

    renderWithProviders(<NotificationsList />);

    await screen.findByText("Monthly report ready");
    expect(
      screen.queryByRole("link", { name: /Monthly report ready/ })
    ).not.toBeInTheDocument();
    // Still actionable: marking read is a real act even with nowhere to go.
    expect(
      screen.getByRole("button", { name: /Monthly report ready/ })
    ).toBeVisible();
  });

  it("marks a notification read when it is opened", async () => {
    stubList();
    stubMarkRead();

    renderWithProviders(<NotificationsList />);
    const link = await screen.findByRole("link", {
      name: /Action assigned to you/,
    });
    await userEvent.click(link);

    await waitFor(() => expect(readPosts).toHaveLength(1));
    expect(readPosts[0]).toContain("NTF-001");
  });

  it("does not re-mark one that is already read", async () => {
    stubList([notification({ read: true })]);
    stubMarkRead();

    renderWithProviders(<NotificationsList />);
    await userEvent.click(
      await screen.findByRole("link", { name: /Action assigned to you/ })
    );

    // A no-op write is still a write, and the handler audits nothing useful.
    await waitFor(() => expect(readPosts).toHaveLength(0));
  });

  /** Unread is weight plus a labelled dot, never colour alone (WCAG 1.4.1). */
  it("marks unread in text, not only visually", async () => {
    stubList();

    renderWithProviders(<NotificationsList />);

    expect(await screen.findByText("Unread")).toBeInTheDocument();
  });

  /**
   * The flag reaches the server rather than being applied in the browser —
   * filtering ten rows client-side would look identical on the seeded plant and
   * be wrong on a real one.
   *
   * Switching *back* asserts the control state, not a second request: `All` is
   * the key that was already fetched, and a fresh cache entry is served without
   * a refetch. That is correct, and asserting a request here would have been
   * asserting a cache miss.
   */
  it("sends the unread filter to the server and tracks which tab is active", async () => {
    stubList();

    renderWithProviders(<NotificationsList />);
    await screen.findByText("Action assigned to you");
    expect(lastQuery.unread).toBeUndefined();

    await userEvent.click(screen.getByRole("button", { name: "Unread" }));
    await waitFor(() => expect(lastQuery.unread).toBe(true));
    expect(screen.getByRole("button", { name: "Unread" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    await userEvent.click(screen.getByRole("button", { name: "All" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
        "aria-pressed",
        "true"
      )
    );
    expect(screen.getByRole("button", { name: "Unread" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  /**
   * "No notifications yet" on a failed request is not an empty state — it is a
   * false statement about somebody's inbox.
   */
  it("distinguishes a failed load from an empty inbox", async () => {
    mockRoute("GET", /\/notifications$/, () => envelope(null), 500);

    // `retry: false` — the app singleton's one retry with backoff outlasts
    // `findBy*`'s one-second default.
    renderWithProviders(<NotificationsList />, {
      queryClient: createTestQueryClient(),
    });

    expect(
      await screen.findByText(/Notifications could not be loaded/)
    ).toBeVisible();
    expect(screen.queryByText("No notifications yet")).not.toBeInTheDocument();
  });

  it("says which empty state it is in", async () => {
    stubList([], 0);

    renderWithProviders(<NotificationsList />);
    expect(await screen.findByText("No notifications yet")).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Unread" }));
    expect(await screen.findByText("Nothing unread")).toBeVisible();
  });

  /**
   * FR-NOT-01 is "in-app **and by email**". The email half is an SMTP relay
   * (§3.3) — not a frontend capability — and the screen says so rather than
   * implying both are working.
   */
  it("discloses that email delivery is not shown here", async () => {
    stubList();

    renderWithProviders(<NotificationsList />);

    expect(await screen.findByText(/Email delivery is handled/)).toBeVisible();
  });

  /**
   * The prototype has "Mark all read" (app-source 1849). There is no bulk
   * endpoint, and looping N writes from the browser is a different operation —
   * it can half-fail and writes N audit events for one act.
   */
  it("offers no bulk mark-all, which has no endpoint behind it", async () => {
    stubList();

    renderWithProviders(<NotificationsList />);
    await screen.findByText("Action assigned to you");

    expect(
      screen.queryByRole("button", { name: /mark all/i })
    ).not.toBeInTheDocument();
  });
});

describe("NotificationsTray", () => {
  /**
   * The tray makes two requests: one for the rows it shows, one asking only for
   * the unread `total`. Stubbing them separately is what lets these tests assert
   * the badge is the server's number rather than a count of what fits.
   */
  const stubTray = (recent: readonly unknown[], unreadTotal: number) => {
    mockRoute("GET", /\/notifications$/, (config) => {
      const params = (config.params ?? {}) as Record<string, unknown>;
      return params.unread === true
        ? paginatedEnvelope(unreadTotal > 0 ? [notification()] : [], {
            total: unreadTotal,
          })
        : paginatedEnvelope(recent, { total: recent.length });
    });
  };

  it("counts unread on the badge and names it for a screen reader", async () => {
    stubTray([notification(), notification({ id: "NTF-002", read: true })], 1);

    renderWithProviders(<NotificationsTray />);

    expect(
      await screen.findByRole("button", { name: "Notifications, 1 unread" })
    ).toBeVisible();
  });

  it("says so when nothing is unread", async () => {
    stubTray([notification({ read: true })], 0);

    renderWithProviders(<NotificationsTray />);

    expect(
      await screen.findByRole("button", { name: "Notifications, none unread" })
    ).toBeVisible();
  });

  /**
   * **The badge is the server's count, not a sample of it.**
   *
   * An earlier version counted unread among the six rows it had fetched, so a
   * user whose newest six were read and whose next fourteen were not was told
   * "none unread". That is a false statement about an inbox, not conservative
   * rounding — so the tray asks a second, one-row question purely to read
   * `total` off the unread envelope.
   */
  it("reports the server's unread total, not the unread among six rows", async () => {
    mockRoute("GET", /\/notifications$/, (config) => {
      const params = (config.params ?? {}) as Record<string, unknown>;
      // The recent page: six rows, all of them already read.
      if (params.unread !== true) {
        return paginatedEnvelope(
          Array.from({ length: 6 }, (_, index) =>
            notification({ id: `NTF-${index}`, read: true })
          ),
          { total: 20 }
        );
      }
      // The count question: fourteen unread sit below the fold.
      return paginatedEnvelope([notification({ id: "NTF-old" })], {
        total: 14,
      });
    });

    renderWithProviders(<NotificationsTray />);

    expect(
      await screen.findByRole("button", { name: "Notifications, 14 unread" })
    ).toBeVisible();
  });
});
