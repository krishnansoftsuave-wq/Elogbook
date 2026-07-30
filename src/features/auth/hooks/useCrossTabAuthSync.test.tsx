import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/constants/routes";
import { useCrossTabAuthSync } from "@/features/auth/hooks/useCrossTabAuthSync";
import { LOGOUT_EPOCH_KEY } from "@/lib/auth/tokenStorage";
import { useAuthStore } from "@/store/authStore";
import { createTestQueryClient, renderWithProviders } from "@/test/utils";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

const SyncProbe = () => {
  useCrossTabAuthSync();
  return <p>listening</p>;
};

/** What a sibling tab's sign-out looks like arriving in this one. */
const logoutFromAnotherTab = () => {
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: LOGOUT_EPOCH_KEY,
      newValue: String(Date.now()),
    })
  );
};

describe("useCrossTabAuthSync", () => {
  beforeEach(() => {
    replace.mockClear();
    useAuthStore.setState({
      token: "token-1",
      expiresAt: Date.now() + 60_000,
      hasHydrated: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useAuthStore.setState({ token: null, expiresAt: null });
  });

  it("ends this tab's session when another tab signs out", async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["probe"], "cached");
    renderWithProviders(<SyncProbe />, { queryClient });

    logoutFromAnotherTab();

    await waitFor(() => {
      expect(useAuthStore.getState().token).toBeNull();
    });
    expect(queryClient.getQueryData(["probe"])).toBeUndefined();
    expect(replace).toHaveBeenCalledWith(ROUTES.LOGIN);
  });

  it("ignores storage writes under any other key", () => {
    renderWithProviders(<SyncProbe />);

    window.dispatchEvent(
      new StorageEvent("storage", { key: "theme", newValue: "dark" })
    );

    expect(useAuthStore.getState().token).toBe("token-1");
    expect(replace).not.toHaveBeenCalled();
  });

  it("ignores the key being removed, which is not a sign-out", () => {
    renderWithProviders(<SyncProbe />);

    window.dispatchEvent(
      new StorageEvent("storage", { key: LOGOUT_EPOCH_KEY, newValue: null })
    );

    expect(useAuthStore.getState().token).toBe("token-1");
    expect(replace).not.toHaveBeenCalled();
  });

  it("clears without navigating when this tab is already on the login page", async () => {
    vi.stubGlobal("location", {
      pathname: ROUTES.LOGIN,
      search: "",
      protocol: "http:",
      assign: vi.fn(),
    });
    renderWithProviders(<SyncProbe />);

    logoutFromAnotherTab();

    await waitFor(() => {
      expect(useAuthStore.getState().token).toBeNull();
    });
    expect(replace).not.toHaveBeenCalled();
  });

  it("stops listening once the tab unmounts", () => {
    const { unmount } = renderWithProviders(<SyncProbe />);

    unmount();
    logoutFromAnotherTab();

    expect(useAuthStore.getState().token).toBe("token-1");
  });
});
