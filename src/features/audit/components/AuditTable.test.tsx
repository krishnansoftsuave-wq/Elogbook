import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { AuditTable } from "@/features/audit/components/AuditTable";
import {
  installMockApi,
  mockRoute,
  paginatedEnvelope,
  resetMockApi,
} from "@/test/mockApi";
import { renderWithProviders } from "@/test/utils";

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
});

describe("AuditTable", () => {
  it("renders the prototype's six columns", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubDirectory();
    stubAudit();

    renderWithProviders(<AuditTable />);

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

    renderWithProviders(<AuditTable />);

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

    renderWithProviders(<AuditTable />);

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

    renderWithProviders(<AuditTable />);

    const failed = await screen.findByRole("row", { name: /Hamed Al-Siyabi/ });
    expect(within(failed).getByText("Failure")).toBeVisible();

    const succeeded = screen.getByRole("row", { name: /Said Al-Busaidi/ });
    expect(within(succeeded).getByText("Success")).toBeVisible();
  });

  it("sends the filters as request params", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubDirectory();

    let params: Record<string, unknown> | undefined;
    mockRoute("GET", /\/audit$/, (config) => {
      params = config.params;
      return paginatedEnvelope([event()]);
    });

    renderWithProviders(<AuditTable />);
    await screen.findByRole("row", { name: /Said Al-Busaidi/ });

    await userEvent.type(
      screen.getByLabelText("Search the audit log"),
      "XV-118"
    );

    await waitFor(() => expect(params?.search).toBe("XV-118"));
    // The `all` sentinels are dropped rather than sent.
    expect(params).not.toHaveProperty("action");
    expect(params).not.toHaveProperty("username");
  });

  it("sends a date range the server can bound on", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubDirectory();

    let params: Record<string, unknown> | undefined;
    mockRoute("GET", /\/audit$/, (config) => {
      params = config.params;
      return paginatedEnvelope([event()]);
    });

    renderWithProviders(<AuditTable />);
    await screen.findByRole("row", { name: /Said Al-Busaidi/ });

    const from = screen.getByLabelText("From");
    await userEvent.type(from, "2026-07-30");

    await waitFor(() => expect(params?.from).toBe("2026-07-30"));
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

    renderWithProviders(<AuditTable />);

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

    renderWithProviders(<AuditTable />);

    expect(
      await screen.findByText("No activity has been recorded yet.")
    ).toBeVisible();

    await userEvent.type(screen.getByLabelText("Search the audit log"), "zzz");

    expect(
      await screen.findByText("No activity matches these filters.")
    ).toBeVisible();
  });

  /**
   * FR-REP-06 — "Record every report export in the audit trail" — is real, and
   * no export endpoint exists in this build. The prototype's Export button
   * fires a toast; shipping it would claim something the platform cannot do.
   */
  it("offers no Export control", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubDirectory();
    stubAudit();

    renderWithProviders(<AuditTable />);
    // Positive control: the table rendered, so the absence below means
    // something.
    await screen.findByRole("row", { name: /Said Al-Busaidi/ });

    expect(
      screen.queryByRole("button", { name: /export/i })
    ).not.toBeInTheDocument();
  });
});
