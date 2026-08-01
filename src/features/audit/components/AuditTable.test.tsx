import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AuditTable,
  ExportAuditButton,
} from "@/features/audit/components/AuditTable";
import { AUDIT_FILTERS_DEFAULTS } from "@/features/audit/hooks/auditFilterParams";
import {
  installMockApi,
  mockRoute,
  paginatedEnvelope,
  resetMockApi,
} from "@/test/mockApi";
import { renderWithProviders } from "@/test/utils";

/*
  Mocked at the module boundary, same as `NotificationsList.test.tsx` —
  asserted here rather than by counting rendered toasts, because
  `renderWithProviders` mounts no `<Toaster/>` to count.
*/
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

/*
  `useAuditFilters` mirrors filter state into the URL via `router.replace`.
  `vi.hoisted` gives the mock factory below a `replace` it can close over
  that is also the one test bodies import — the factory itself runs on every
  `useRouter()` call, so a fresh `vi.fn()` there would be a different spy
  per render and nothing a test could assert calls against.
*/
const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/audit",
  useRouter: () => ({ replace }),
}));

const ADMIN_PERMISSIONS = ["*"];

const event = (overrides: Record<string, unknown> = {}) => ({
  id: "AUD-0001",
  occurred_at: "2026-07-30T09:14:00+00:00",
  actor: { username: "said.albusaidi", display_name: "Said Al-Busaidi" },
  role_label: "Operator",
  action: "VIEW_ACTION",
  target: "ACT-2041",
  result: "success",
  ...overrides,
});

/** The seed's actor-less row — a retention purge nobody performed. */
const SYSTEM_EVENT = event({
  id: "AUD-0007",
  actor: null,
  // An em dash, as the prototype's own `System | —` row has it.
  role_label: "—",
  action: "RETENTION_PURGE",
  target: "Logs older than 7 years",
});

const FAILED_LOGIN = event({
  id: "AUD-0008",
  actor: { username: "hamed.alsiyabi", display_name: "Hamed Al-Siyabi" },
  role_label: "—",
  action: "LOGIN",
  target: "AD FS / OAuth 2.0 — unmapped group(s): OLNG-CONTRACTORS",
  result: "failure",
});

/** The User filter reads the directory, not the log. */
const stubDirectory = () => {
  mockRoute("GET", /\/users$/, () =>
    paginatedEnvelope([
      {
        username: "said.albusaidi",
        display_name: "Said Al-Busaidi",
        ad_groups: ["OLNG-ELOG-OPERATORS"],
        roles: ["operator"],
        status: "active",
        last_seen_at: null,
      },
    ])
  );
};

const stubAudit = (items: readonly unknown[] = [event()]) => {
  mockRoute("GET", /\/audit$/, () => paginatedEnvelope(items));
};

afterEach(() => {
  resetMockApi();
  replace.mockClear();
});

describe("AuditTable", () => {
  it("renders the prototype's six columns", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubDirectory();
    stubAudit();

    renderWithProviders(<AuditTable initialFilters={AUDIT_FILTERS_DEFAULTS} />);

    // The timestamp header names the clock, because the whole app is on one.
    expect(
      await screen.findByRole("columnheader", { name: /Timestamp \(GST\)/ })
    ).toBeVisible();
    for (const header of ["User", "Role", "Action", "Target", "Result"]) {
      expect(screen.getByRole("columnheader", { name: header })).toBeVisible();
    }
  });

  it("shows the actor, the role and the raw action verb", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubDirectory();
    stubAudit();

    renderWithProviders(<AuditTable initialFilters={AUDIT_FILTERS_DEFAULTS} />);

    const row = await screen.findByRole("row", { name: /Said Al-Busaidi/ });
    expect(within(row).getByText("Operator")).toBeVisible();
    expect(within(row).getByText("VIEW_ACTION")).toBeVisible();
    expect(within(row).getByText("ACT-2041")).toBeVisible();
  });

  /**
   * A blank cell would read as missing data. The platform itself performed this
   * one, and saying so is the difference between a gap and a fact.
   */
  it("renders an actor-less row as System", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubDirectory();
    stubAudit([SYSTEM_EVENT]);

    renderWithProviders(<AuditTable initialFilters={AUDIT_FILTERS_DEFAULTS} />);

    const row = await screen.findByRole("row", { name: /RETENTION_PURGE/ });
    // Asserted on the User cell specifically. The column order is the
    // prototype's spec: Timestamp · User · Role · Action · Target · Result.
    const cells = within(row).getAllByRole("cell");

    expect(cells[1]).toHaveTextContent("System");
    expect(cells[2]).toHaveTextContent("—");
  });

  /**
   * WCAG 1.4.1 — the prototype renders Result in a hardcoded green with a tick,
   * unconditionally, because it has no failure row. Colour alone is not a
   * signal, so the cell carries the word too.
   */
  it("distinguishes a failure by text, not only by colour", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubDirectory();
    stubAudit([event(), FAILED_LOGIN]);

    renderWithProviders(<AuditTable initialFilters={AUDIT_FILTERS_DEFAULTS} />);

    const failed = await screen.findByRole("row", { name: /Hamed Al-Siyabi/ });
    expect(within(failed).getByText("Failure")).toBeVisible();

    const succeeded = screen.getByRole("row", { name: /Said Al-Busaidi/ });
    expect(within(succeeded).getByText("Success")).toBeVisible();
  });

  it("sends a date range the server can bound on, dropping unused sentinels", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubDirectory();

    let params: Record<string, unknown> | undefined;
    mockRoute("GET", /\/audit$/, (config) => {
      params = config.params;
      return paginatedEnvelope([event()]);
    });

    renderWithProviders(<AuditTable initialFilters={AUDIT_FILTERS_DEFAULTS} />);
    await screen.findByRole("row", { name: /Said Al-Busaidi/ });

    // The two date fields live behind the single "Date" chip.
    await userEvent.click(
      screen.getByRole("button", { name: "Filter by date" })
    );
    const from = await screen.findByLabelText("From");
    await userEvent.type(from, "2026-07-30");

    await waitFor(() => expect(params?.from).toBe("2026-07-30"));
    // The `all` sentinels are dropped rather than sent.
    expect(params).not.toHaveProperty("action");
    expect(params).not.toHaveProperty("username");
  });

  /**
   * The worst version of the error-as-empty mistake anywhere in this app: a 500
   * rendering "No activity recorded yet" tells somebody reviewing an audit trail
   * that nothing happened.
   */
  it("says the log could not be loaded rather than that it is empty", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubDirectory();
    mockRoute("GET", /\/audit$/, () => paginatedEnvelope([]), 500);

    renderWithProviders(<AuditTable initialFilters={AUDIT_FILTERS_DEFAULTS} />);

    // The shared client retries a read once with a ~1s backoff.
    const alert = await screen.findByRole("alert", undefined, {
      timeout: 5000,
    });
    expect(alert).toHaveTextContent(/could not be loaded/);
    expect(alert).toHaveTextContent(/not an empty log/);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("distinguishes a filtered empty result from an empty log", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubDirectory();
    stubAudit([]);

    renderWithProviders(<AuditTable initialFilters={AUDIT_FILTERS_DEFAULTS} />);

    expect(
      await screen.findByText("No activity has been recorded yet.")
    ).toBeVisible();

    // The two date fields live behind the single "Date" chip.
    await userEvent.click(
      screen.getByRole("button", { name: "Filter by date" })
    );
    const from = await screen.findByLabelText("From");
    await userEvent.type(from, "2026-07-30");

    expect(
      await screen.findByText("No activity matches these filters.")
    ).toBeVisible();
  });

  /**
   * A shared or bookmarked audit URL must land on the same filtered view it
   * was copied from — `initialFilters` is how `AdminAuditPage` hands the
   * inbound `searchParams` down, and this is what proves the table actually
   * opens filtered rather than defaulting and only picking the URL up later.
   */
  it("seeds from initialFilters, so a shared audit URL opens already filtered", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubDirectory();

    let params: Record<string, unknown> | undefined;
    mockRoute("GET", /\/audit$/, (config) => {
      params = config.params;
      return paginatedEnvelope([event()]);
    });

    renderWithProviders(
      <AuditTable
        initialFilters={{
          ...AUDIT_FILTERS_DEFAULTS,
          username: "said.albusaidi",
        }}
      />
    );

    // The chip itself exists immediately (its placeholder does); the display
    // name it resolves `username` to depends on the directory query landing.
    const userChip = await screen.findByRole("combobox", {
      name: "Filter by user",
    });
    await waitFor(() => expect(userChip).toHaveTextContent("Said Al-Busaidi"));
    await waitFor(() => expect(params?.username).toBe("said.albusaidi"));
  });

  /**
   * The other half of the round trip: a filter picked here has to reach the
   * URL, replacing rather than pushing so narrowing a filter does not fill
   * the back button with one entry per click.
   */
  it("mirrors a filter change into the URL via router.replace", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubDirectory();
    stubAudit();

    renderWithProviders(<AuditTable initialFilters={AUDIT_FILTERS_DEFAULTS} />);
    await screen.findByRole("row", { name: /Said Al-Busaidi/ });
    replace.mockClear();

    await userEvent.click(
      screen.getByRole("button", { name: "Filter by date" })
    );
    const from = await screen.findByLabelText("From");
    await userEvent.type(from, "2026-07-30");

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        expect.stringContaining("from=2026-07-30"),
        expect.objectContaining({ scroll: false })
      )
    );
  });
});

describe("ExportAuditButton", () => {
  /**
   * FR-REP-06 requires every export be audited, and there is no export
   * endpoint in this build to audit — so the button is disabled rather than
   * firing the prototype's toast for something that did not happen. A fake
   * success here would be exactly the false claim `AuditTable` itself refuses
   * to make for a 500 (see "says the log could not be loaded" above).
   */
  it("is disabled instead of claiming a fake export happened", () => {
    renderWithProviders(<ExportAuditButton />);

    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
