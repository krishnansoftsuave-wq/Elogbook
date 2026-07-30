import { screen } from "@testing-library/react";
import {
  AxiosError,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSession } from "@/features/auth/hooks/useSession";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/store/authStore";
import { renderWithProviders } from "@/test/utils";

const sentUrls: string[] = [];
const realAdapter = api.defaults.adapter;

const meta = {
  correlation_id: "fca71eb84a9c4233a5fe43f5ce6421e9",
  timestamp: "2026-07-30T09:58:47.185814+00:00",
};

/** §5's documented `GET /me` body, snake_case exactly as the wire sends it. */
const operatorEnvelope = {
  success: true,
  data: {
    subject: "dev|said.albusaidi",
    username: "said.albusaidi",
    display_name: "Said Al Busaidi",
    roles: ["operator"],
    groups: ["OLNG-ELOG-OPERATORS"],
    permissions: ["shift:read", "summary:read", "action:write"],
    area_scope: null,
  },
  meta,
};

const denyEnvelope = {
  success: false,
  error: {
    code: "unauthorized",
    message:
      "Access denied: your AD account is not mapped to any platform role. Contact an administrator to request access.",
    details: null,
  },
  meta,
};

const respondWith =
  (status: number, data: unknown): AxiosAdapter =>
  async (config: InternalAxiosRequestConfig) => {
    sentUrls.push(config.url ?? "");
    const response: AxiosResponse = {
      data,
      status,
      statusText: "",
      headers: {},
      config,
    };
    if (status >= 200 && status < 300) return response;
    throw new AxiosError(
      "Request failed",
      "ERR_BAD_REQUEST",
      config,
      null,
      response
    );
  };

const SessionProbe = () => {
  const { session, permissions, isLoading } = useSession();

  if (isLoading) return <p>Checking your access</p>;
  if (!session) return <p>Signed out</p>;

  return (
    <section>
      <h1>{session.displayName}</h1>
      <p>{permissions.join(", ")}</p>
    </section>
  );
};

describe("useSession", () => {
  beforeEach(() => {
    sentUrls.length = 0;
    useAuthStore.setState({
      token: null,
      expiresAt: null,
      hasHydrated: true,
    });
    vi.stubGlobal("location", {
      pathname: "/logbook",
      search: "",
      protocol: "http:",
      assign: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    api.defaults.adapter = realAdapter;
    useAuthStore.setState({ token: null, expiresAt: null });
  });

  it("reports a signed-out visitor without ever calling /me", () => {
    api.defaults.adapter = respondWith(200, operatorEnvelope);

    renderWithProviders(<SessionProbe />);

    expect(screen.getByText("Signed out")).toBeInTheDocument();
    expect(sentUrls).toHaveLength(0);
  });

  it("exposes the display name and the permission union from /me", async () => {
    api.defaults.adapter = respondWith(200, operatorEnvelope);
    useAuthStore.setState({ token: "token-1", expiresAt: Date.now() + 60_000 });

    renderWithProviders(<SessionProbe />);

    expect(
      await screen.findByRole("heading", { name: "Said Al Busaidi" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("shift:read, summary:read, action:write")
    ).toBeInTheDocument();
    expect(sentUrls).toEqual(["/me"]);
  });

  it("ends the session and reports signed out when /me answers 401", async () => {
    // §5's deny is NOT surfaced from here. The interceptor ends the session on
    // that 401 and clears the cache, which destroys the very query the error
    // would have landed on — so this hook can only ever report the aftermath.
    // `CallbackExchange` owns the deny message, off the sign-in mutation.
    api.defaults.adapter = respondWith(401, denyEnvelope);
    useAuthStore.setState({ token: "token-1", expiresAt: Date.now() + 60_000 });

    renderWithProviders(<SessionProbe />);

    expect(await screen.findByText("Signed out")).toBeInTheDocument();
    expect(useAuthStore.getState().token).toBeNull();
    expect(sentUrls).toEqual(["/me"]);
  });

  it("waits for the store to rehydrate before answering", () => {
    useAuthStore.setState({ hasHydrated: false });

    renderWithProviders(<SessionProbe />);

    expect(screen.getByText("Checking your access")).toBeInTheDocument();
  });
});
