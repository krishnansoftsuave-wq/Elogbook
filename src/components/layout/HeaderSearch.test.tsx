import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HeaderSearch } from "@/components/layout/HeaderSearch";
import { ROUTES } from "@/constants/routes";
import { installMockApi, resetMockApi } from "@/test/mockApi";
import { renderWithProviders } from "@/test/utils";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

/** The permissions `/assistant` requires — `ROUTE_PERMISSIONS.ASSISTANT`. */
const CAN_ASK = ["shift:read", "assistant:query"];

const field = () =>
  screen.findByRole("searchbox", { name: "Search the logbook" });

beforeEach(() => {
  push.mockClear();
});

afterEach(() => {
  resetMockApi();
});

describe("HeaderSearch", () => {
  it("hands the question to the assistant", async () => {
    installMockApi({ permissions: CAN_ASK });

    renderWithProviders(<HeaderSearch />);

    await userEvent.type(await field(), "compressor trip{Enter}");

    expect(push).toHaveBeenCalledWith(
      `${ROUTES.ASSISTANT}?q=compressor%20trip`
    );
  });

  /**
   * A question is free text and goes into a URL, so it has to survive the trip.
   * `&`, `#` and `?` would otherwise truncate or split the query string.
   */
  it("encodes a question containing URL syntax", async () => {
    installMockApi({ permissions: CAN_ASK });

    renderWithProviders(<HeaderSearch />);

    await userEvent.type(await field(), "P&ID #12 — why?{Enter}");

    expect(push).toHaveBeenCalledWith(
      `${ROUTES.ASSISTANT}?q=${encodeURIComponent("P&ID #12 — why?")}`
    );
  });

  it("does not navigate on an empty or whitespace-only question", async () => {
    installMockApi({ permissions: CAN_ASK });

    renderWithProviders(<HeaderSearch />);

    const input = await field();
    await userEvent.type(input, "{Enter}");
    await userEvent.type(input, "   {Enter}");

    expect(push).not.toHaveBeenCalled();
  });

  it("clears itself once the question has been handed over", async () => {
    installMockApi({ permissions: CAN_ASK });

    renderWithProviders(<HeaderSearch />);

    const input = await field();
    await userEvent.type(input, "compressor trip{Enter}");

    expect(input).toHaveValue("");
  });

  /**
   * §7.4 — `assistant:query` is held by Operator, Supervisor and Management but
   * not Super User, whose only outcome here would be the route guard bouncing
   * them. The guard is still the authority; this only stops the app offering a
   * control it will refuse (FR-ADM-03).
   */
  it("is not offered to a session that cannot reach the assistant", async () => {
    installMockApi({ permissions: ["user:read", "dashboard:configure"] });

    renderWithProviders(<HeaderSearch />);

    // Waited for, not asserted immediately: `useSession` resolves `GET /me`
    // asynchronously, so an instant assertion passes for the wrong reason.
    await vi.waitFor(() =>
      expect(screen.queryByRole("searchbox")).not.toBeInTheDocument()
    );
  });

  it("renders nothing before there is a session", () => {
    // No `installMockApi`, so there is no token and `useSession` returns null.
    renderWithProviders(<HeaderSearch />);

    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  /**
   * The wrapper is a `search` landmark. The prototype's is a plain `div`, which
   * a screen reader cannot jump to (WCAG 2.4.1).
   */
  it("exposes itself as a search landmark", async () => {
    installMockApi({ permissions: CAN_ASK });

    renderWithProviders(<HeaderSearch />);

    expect(await screen.findByRole("search")).toBeVisible();
  });
});
