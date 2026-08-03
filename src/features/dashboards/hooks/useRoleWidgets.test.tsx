import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { useRoleWidgets } from "@/features/dashboards/hooks/useRoleWidgets";
import { getQueryClient } from "@/lib/query-client";
import {
  envelope,
  installMockApi,
  mockRoute,
  resetMockApi,
} from "@/test/mockApi";

/**
 * **FR-DASH-01** — which widgets a role's dashboard is composed of.
 *
 * Tested at the hook rather than through `Dashboard` because two of the three
 * branches are not reachable from that screen: the Administrator is dispatched
 * to `SystemMonitor` before `OperationsDashboard` renders, so the published-set
 * fallback has no route through the UI and would otherwise go unpinned.
 */

const widget = (id: string, roles: readonly string[] = [], enabled = true) => ({
  id,
  label: id,
  type: "list",
  assigned_roles: roles,
  enabled,
});

const LIBRARY = [
  widget("WID-001", ["operator"]),
  widget("WID-003", ["management"]),
  widget("WID-014"),
  widget("WID-015"),
  widget("WID-016"),
];

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={getQueryClient()}>
    {children}
  </QueryClientProvider>
);

const idsFor = async (
  roles: string[],
  library: readonly unknown[] = LIBRARY
) => {
  installMockApi({ roles, permissions: ["action:read"] });
  mockRoute("GET", /\/dashboards\/widgets$/, () =>
    envelope({ items: library })
  );

  const { result } = renderHook(() => useRoleWidgets(), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  return result.current.widgets.map((item) => item.id);
};

afterEach(() => {
  resetMockApi();
});

describe("useRoleWidgets", () => {
  it("gives a configurable role only what it is assigned", async () => {
    expect(await idsFor(["operator"])).toEqual(["WID-001"]);
  });

  /**
   * The other half of that rule, and what makes FR-DASH-02 enforceable: a
   * configurable role with nothing assigned stays empty rather than falling
   * back on everything.
   */
  it("keeps a configurable role empty when its assignment is cleared", async () => {
    expect(await idsFor(["supervisor"])).toEqual([]);
  });

  /**
   * FR-DASH-01's config screen has three columns and none is the Super User's,
   * so their set cannot come from the assignment table. It is the prototype's
   * `defaultWidgets('superuser')` (app-source.txt 139) instead — and in that
   * order, which is not the library's.
   */
  it("gives the Super User the prototype's four, in the prototype's order", async () => {
    expect(
      await idsFor(
        ["super_user"],
        [
          widget("WID-016"),
          widget("WID-015"),
          widget("WID-003", ["operator"]),
          widget("WID-014"),
          widget("WID-001"),
        ]
      )
    ).toEqual(["WID-001", "WID-014", "WID-015", "WID-016"]);
  });

  /** Selected *from* the published library, so unpublishing still removes it. */
  it("drops a Super User widget the library has unpublished", async () => {
    expect(
      await idsFor(
        ["super_user"],
        [
          widget("WID-001"),
          widget("WID-014", [], false),
          widget("WID-015"),
          widget("WID-016"),
        ]
      )
    ).toEqual(["WID-001", "WID-015", "WID-016"]);
  });

  /**
   * The Administrator has no column either, and no designed widget set — §6.4
   * sends them to the system monitor. They keep the published set, which is
   * FR-HOME-02's "everything the user may see".
   */
  it("gives the Administrator the published set", async () => {
    expect(await idsFor(["administrator"])).toEqual([
      "WID-001",
      "WID-003",
      "WID-014",
      "WID-015",
      "WID-016",
    ]);
  });
});
