import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { TrendsExportMenu } from "@/features/trends/components/TrendsExportMenu";

/**
 * `src/test/setup.ts`'s global `ResizeObserver` stub is a `vi.fn()` wrapping
 * an arrow-function implementation, which cannot be used as a constructor.
 * That has been harmless for every test so far because nothing had actually
 * opened a Base UI popup — floating-ui's `autoUpdate` calls
 * `new ResizeObserver(...)` the moment one does. This menu is the first thing
 * in this lane to open one, so it needs a real constructible stand-in, scoped
 * to this file rather than touching the shared setup every other test uses.
 */
class StubResizeObserver {
  observe() {
    /* noop */
  }
  unobserve() {
    /* noop */
  }
  disconnect() {
    /* noop */
  }
}

describe("TrendsExportMenu", () => {
  const originalResizeObserver = window.ResizeObserver;

  beforeEach(() => {
    window.ResizeObserver =
      StubResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    window.ResizeObserver = originalResizeObserver;
  });

  it("opens to a menu naming every export format, each disabled", async () => {
    const user = userEvent.setup();
    render(<TrendsExportMenu />);

    await user.click(screen.getByRole("button", { name: "Export" }));

    // `findBy` rather than `getBy`: the popup mounts asynchronously (Base UI
    // positions it via floating-ui before committing `data-open`).
    for (const label of [
      "Export as PDF",
      "Export as Excel",
      "Export as Word",
    ]) {
      const item = await screen.findByRole("menuitem", { name: label });
      expect(item).toHaveAttribute("data-disabled", "");
      expect(item).toHaveAttribute("aria-disabled", "true");
    }
  });

  it("names the unmet requirements rather than faking a download", async () => {
    const user = userEvent.setup();
    render(<TrendsExportMenu />);

    await user.click(screen.getByRole("button", { name: "Export" }));

    expect(await screen.findByText(/FR-REP-03/)).toBeInTheDocument();
    expect(screen.getByText(/FR-REP-06/)).toBeInTheDocument();
  });

  it("does not open the menu until the trigger is activated", () => {
    render(<TrendsExportMenu />);
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
  });
});
