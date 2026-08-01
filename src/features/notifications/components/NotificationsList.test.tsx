import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  MarkAllReadButton,
  NotificationsList,
} from "@/features/notifications/components/NotificationsList";
import { NotificationsTray } from "@/features/notifications/components/NotificationsTray";
import { createTestQueryClient, renderWithProviders } from "@/test/utils";
import {
  envelope,
  installMockApi,
  mockRoute,
  paginatedEnvelope,
  resetMockApi,
} from "@/test/mockApi";

// Mocked at the module boundary — renderWithProviders mounts no <Toaster/> to count against.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Fixed two hours after the fixture's created_at so formatRelativeTime deterministically produces "2h ago".
const NOW = new Date("2026-07-31T12:45:00+00:00");
vi.mock("@/hooks/useNow", () => ({
  useNow: () => NOW,
}));

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

let readPosts: string[] = [];

const stubList = (
  items: readonly unknown[] = [notification()],
  total?: number
) => {
  mockRoute("GET", /\/notifications$/, () =>
    paginatedEnvelope(items, { total: total ?? items.length })
  );
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
  readPosts = [];
  vi.clearAllMocks();
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
    // NOW is fixed two hours after the fixture's created_at.
    expect(screen.getByText("2h ago")).toBeVisible();
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

  // Reports (§7.8) have no route yet — a link would 404 rather than read as "not built yet".
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

  // Re-filters the already-fetched page instead of asking the server again with unread=true, which used to cost a second request.
  it("filters to unread client-side from the one page already fetched, with no second request", async () => {
    let requestCount = 0;
    mockRoute("GET", /\/notifications$/, () => {
      requestCount += 1;
      return paginatedEnvelope([
        notification(), // unread by default
        notification({
          id: "NTF-002",
          title: "Shift summary ready",
          body: "Already dealt with",
          read: true,
        }),
      ]);
    });

    renderWithProviders(<NotificationsList />);
    await screen.findByText("Action assigned to you");
    expect(screen.getByText("Shift summary ready")).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Unread" }));
    expect(screen.getByRole("button", { name: "Unread" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByText("Action assigned to you")).toBeVisible();
    expect(screen.queryByText("Shift summary ready")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Unread" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.getByText("Shift summary ready")).toBeVisible();

    // NotificationsList and ThisWeekCard share the identical query — one request for the whole render.
    expect(requestCount).toBe(1);
  });

  // "No notifications yet" on a failed request would misstate the inbox, not describe an empty one.
  it("distinguishes a failed load from an empty inbox", async () => {
    mockRoute("GET", /\/notifications$/, () => envelope(null), 500);

    // The app's own retry-with-backoff outlasts findBy*'s default timeout.
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
    expect(await screen.findByText("No notifications")).toBeVisible();
  });

  it("shows the notification settings and this-week sidebar cards", async () => {
    stubList();

    renderWithProviders(<NotificationsList />);
    await screen.findByText("Action assigned to you");

    expect(screen.getByText("Notification settings")).toBeVisible();
    expect(screen.getByText("Action assigned to me")).toBeVisible();
    expect(screen.getByText("This week")).toBeVisible();
    expect(screen.getByText("Currently unread")).toBeVisible();
  });
});

describe("MarkAllReadButton", () => {
  // Same query as ThisWeekCard — unread filtering is client-side, so a plain unfiltered stub is enough.
  it("is disabled when nothing is unread", async () => {
    stubList([], 0);

    renderWithProviders(<MarkAllReadButton />);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Mark all read" })
      ).toBeDisabled()
    );
  });

  // No bulk endpoint exists — this loops POST /notifications/:id/read once per unread notification.
  it("marks every currently-unread notification when clicked", async () => {
    stubList([
      notification({ id: "NTF-001" }),
      notification({ id: "NTF-002" }),
    ]);
    stubMarkRead();

    renderWithProviders(<MarkAllReadButton />);
    const button = await screen.findByRole("button", { name: "Mark all read" });
    await waitFor(() => expect(button).toBeEnabled());

    await userEvent.click(button);

    await waitFor(() => expect(readPosts).toHaveLength(2));
    expect(readPosts.some((url) => url.includes("NTF-001"))).toBe(true);
    expect(readPosts.some((url) => url.includes("NTF-002"))).toBe(true);
    expect(toast.success).toHaveBeenCalledWith("All notifications marked read");
  });
});

describe("NotificationsTray", () => {
  // The tray makes two requests (rows shown, unread total) — stubbed separately so tests can assert the badge is the server's number.
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

  // The badge is the server's count, not a sample of the six rows fetched — a second one-row request reads the real unread total.
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
