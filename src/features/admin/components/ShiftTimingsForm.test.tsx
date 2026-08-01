import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { ShiftTimingsForm } from "@/features/admin/components/ShiftTimingsForm";
import {
  envelope,
  installMockApi,
  mockRoute,
  resetMockApi,
} from "@/test/mockApi";
import { renderWithProviders } from "@/test/utils";

const ADMIN_PERMISSIONS = ["*"];

const SEEDED = {
  day_start: "06:00",
  day_end: "18:00",
  night_start: "18:00",
  night_end: "06:00",
  overlap_minutes: 15,
};

const stubConfig = (config: Record<string, unknown> = SEEDED) => {
  mockRoute("GET", /\/admin\/shift-config$/, () => envelope(config));
};

afterEach(() => {
  resetMockApi();
});

describe("ShiftTimingsForm", () => {
  it("loads the stored boundary into the editable fields", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubConfig();

    renderWithProviders(<ShiftTimingsForm />);

    expect(await screen.findByLabelText("Day shift start")).toHaveValue(
      "06:00"
    );
    expect(screen.getByLabelText("Day shift end")).toHaveValue("18:00");
    expect(screen.getByLabelText("Night shift start")).toHaveValue("18:00");
    expect(screen.getByLabelText("Night shift end")).toHaveValue("06:00");
    expect(screen.getByLabelText("Handover overlap (minutes)")).toHaveValue(15);
  });

  /**
   * **All four boundaries are independently editable**, matching the
   * prototype's literal layout (`app-source.txt` 1662–1674).
   */
  it("lets all four boundaries be edited", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubConfig();

    renderWithProviders(<ShiftTimingsForm />);

    const dayEnd = await screen.findByLabelText("Day shift end");
    await userEvent.clear(dayEnd);
    await userEvent.type(dayEnd, "19:00");

    expect(dayEnd).toHaveValue("19:00");
  });

  it("submits the full five-field wire object as edited", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubConfig();

    let sent: unknown;
    mockRoute("PUT", /\/admin\/shift-config$/, (config) => {
      sent = JSON.parse(String(config.data));
      return envelope({ ...SEEDED, day_start: "07:00", day_end: "19:00" });
    });

    renderWithProviders(<ShiftTimingsForm />);

    const start = await screen.findByLabelText("Day shift start");
    const end = await screen.findByLabelText("Day shift end");
    const nightStart = await screen.findByLabelText("Night shift start");
    const nightEnd = await screen.findByLabelText("Night shift end");

    await userEvent.clear(start);
    await userEvent.type(start, "07:00");
    await userEvent.clear(end);
    await userEvent.type(end, "19:00");
    await userEvent.clear(nightStart);
    await userEvent.type(nightStart, "19:00");
    await userEvent.clear(nightEnd);
    await userEvent.type(nightEnd, "07:00");

    await userEvent.click(
      screen.getByRole("button", { name: "Save shift timings" })
    );

    await waitFor(() =>
      expect(sent).toEqual({
        day_start: "07:00",
        day_end: "19:00",
        night_start: "19:00",
        night_end: "07:00",
        overlap_minutes: 15,
      })
    );
  });

  /**
   * **FR-HOME-03** fixes a shift at twelve hours. Editable boundaries make
   * this a validation rule instead of an arithmetic guarantee, so a bad split
   * must be refused with a message that names the requirement.
   */
  it("refuses to submit a day shift that is not twelve hours, and says why", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubConfig();

    let saves = 0;
    mockRoute("PUT", /\/admin\/shift-config$/, () => {
      saves += 1;
      return envelope(SEEDED);
    });

    renderWithProviders(<ShiftTimingsForm />);

    const end = await screen.findByLabelText("Day shift end");
    await userEvent.clear(end);
    await userEvent.type(end, "14:00");
    await userEvent.click(
      screen.getByRole("button", { name: "Save shift timings" })
    );

    expect(
      await screen.findByText(/exactly twelve hours \(FR-HOME-03\)/)
    ).toBeVisible();
    expect(saves).toBe(0);
  });

  it("refuses to submit a negative overlap, and says why", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubConfig();

    let saves = 0;
    mockRoute("PUT", /\/admin\/shift-config$/, () => {
      saves += 1;
      return envelope(SEEDED);
    });

    renderWithProviders(<ShiftTimingsForm />);

    const overlap = await screen.findByLabelText("Handover overlap (minutes)");
    await userEvent.clear(overlap);
    await userEvent.type(overlap, "-5");
    await userEvent.click(
      screen.getByRole("button", { name: "Save shift timings" })
    );

    expect(await screen.findByText(/cannot be negative/)).toBeVisible();
    expect(saves).toBe(0);
  });

  /**
   * The banner is the prototype's copy verbatim, and it is only *true* as of
   * this phase — `GET /shifts/current` ignored the stored value entirely until
   * the boundary was wired.
   */
  it("states what changing the boundary affects", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubConfig();

    renderWithProviders(<ShiftTimingsForm />);

    expect(
      await screen.findByText(/when summaries auto-generate/)
    ).toBeVisible();
    // And which clock the numbers are on.
    expect(screen.getByText(/plant time \(GST\)/)).toBeVisible();
  });

  it("says the timings could not be loaded rather than showing empty fields", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    mockRoute("GET", /\/admin\/shift-config$/, () => envelope(null), 500);

    renderWithProviders(<ShiftTimingsForm />);

    expect(
      await screen.findByRole("alert", undefined, { timeout: 5000 })
    ).toHaveTextContent(/could not be loaded/);
    expect(screen.queryByLabelText("Day shift start")).not.toBeInTheDocument();
  });
});
