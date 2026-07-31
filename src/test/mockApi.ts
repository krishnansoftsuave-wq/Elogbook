import type { AxiosAdapter, AxiosRequestConfig } from "axios";

import { correlationId, nowTimestamp } from "@/mocks/envelope";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/store/authStore";

/**
 * Canned HTTP responses, installed on the shared axios instance.
 *
 * **This mocks the network boundary, not the module under test.**
 * `.claude/rules/03` is explicit about that distinction, and it matters here:
 * stubbing `useActionsList` would prove a component renders whatever a hook
 * returns, which is not a fact anybody needs. Replacing axios's *adapter* — its
 * transport — leaves the whole real pipeline in place: the request interceptor
 * attaches the token, the response is parsed by the feature's Zod schema, and
 * `QueryCache.onError` still owns failures. If a schema and a handler disagree,
 * these tests fail, which is the point.
 *
 * MSW would be the other way to do this and is deliberately not used —
 * `AGENTS.md` rules it out, and the adapter seam needs no dependency.
 */

/**
 * Returns the response **body**, not a `{ status, data }` wrapper.
 *
 * That shape was tried and is a trap: every body here is a §3 envelope, which
 * already has its own `data` key, so destructuring `{ data }` off the responder
 * silently unwrapped the envelope and handed the client a bare page. The schema
 * then rejected it and every test failed identically. Status is a separate
 * argument for exactly that reason.
 */
type Responder = (config: AxiosRequestConfig) => unknown;

interface Route {
  method: string;
  /** Matched against the request path, ignoring the query string. */
  pattern: RegExp;
  respond: Responder;
  status: number;
}

const routes: Route[] = [];
let originalAdapter: AxiosAdapter | undefined;

/** Wraps a payload in the §3 envelope, the way every real handler does. */
export const envelope = (data: unknown) => ({
  success: true,
  data,
  meta: { correlation_id: correlationId(), timestamp: nowTimestamp() },
});

/** Wraps a page of items in `paginatedSchema` inside the §3 envelope. */
export const paginatedEnvelope = (
  items: readonly unknown[],
  overrides: { total?: number; page?: number; pageSize?: number } = {}
) =>
  envelope({
    items,
    total: overrides.total ?? items.length,
    page: overrides.page ?? 1,
    pageSize: overrides.pageSize ?? 10,
  });

const pathOf = (url: string): string => {
  const withoutQuery = url.split("?")[0] ?? "";
  // The instance's `baseURL` is prepended by axios before the adapter runs, so
  // strip whatever origin/prefix precedes `/api/v1` — or nothing, when the
  // configured base URL is empty.
  return withoutQuery.replace(/^https?:\/\/[^/]+/, "");
};

/**
 * Registers a canned response. Later registrations win, so a test can override
 * a default installed by its `beforeEach`.
 */
export const mockRoute = (
  method: string,
  pattern: RegExp,
  respond: Responder,
  status = 200
): void => {
  routes.unshift({ method: method.toUpperCase(), pattern, respond, status });
};

/**
 * Installs the adapter and a signed-in session.
 *
 * The token is what makes the request interceptor attach `Authorization`, and
 * what makes `useMe` run at all — `useSession` gates on it.
 */
export const installMockApi = (
  session: {
    username?: string;
    displayName?: string;
    roles?: string[];
    permissions?: string[];
  } = {}
): void => {
  routes.length = 0;
  originalAdapter ??= api.defaults.adapter as AxiosAdapter | undefined;

  useAuthStore.setState({ token: "test-token", hasHydrated: true });

  mockRoute("GET", /\/me$/, () =>
    envelope({
      subject: `dev|${session.username ?? "said.albusaidi"}`,
      username: session.username ?? "said.albusaidi",
      display_name: session.displayName ?? "Said Al-Busaidi",
      roles: session.roles ?? ["operator"],
      groups: ["OLNG-ELOG-OPERATORS"],
      permissions: session.permissions ?? [
        "shift:read",
        "summary:read",
        "assistant:query",
        "action:read",
        "action:write",
      ],
      area_scope: null,
    })
  );

  api.defaults.adapter = ((config) => {
    const method = (config.method ?? "get").toUpperCase();
    const path = pathOf(config.url ?? "");
    const route = routes.find(
      (candidate) => candidate.method === method && candidate.pattern.test(path)
    );

    if (!route) {
      // Loud on purpose: a request nobody stubbed is a test that would
      // otherwise pass for the wrong reason.
      return Promise.reject(new Error(`No mock route for ${method} ${path}`));
    }

    const { status } = route;
    const response = {
      data: route.respond(config),
      status,
      statusText: "OK",
      headers: {},
      config,
    };

    return status >= 400
      ? Promise.reject(
          Object.assign(new Error(`Request failed with status ${status}`), {
            isAxiosError: true,
            response,
            config,
          })
        )
      : Promise.resolve(response);
  }) as AxiosAdapter;
};

export const resetMockApi = (): void => {
  routes.length = 0;
  if (originalAdapter) api.defaults.adapter = originalAdapter;
  useAuthStore.setState({ token: null, hasHydrated: true });
};
