import type { ReactElement, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";

import { getQueryClient } from "@/lib/query-client";

/**
 * An isolated client, for the few tests that need to own one outright — spying
 * on `clear`, or asserting on cache contents they seeded themselves. Retries and
 * caching are off so those tests stay deterministic.
 */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
}

/**
 * Renders through the same client `app/providers.tsx` uses — the
 * `getQueryClient()` singleton — rather than a fresh one.
 *
 * Non-React code reaches that singleton by module import: `endSession` in
 * `lib/api-client.ts` calls `getQueryClient().clear()` on a 401. A harness that
 * injected a different client made those interactions invisible, so a test could
 * pass against an implementation the real wiring would have broken — which is
 * exactly what happened to the §5 deny path. `test/setup.ts` clears the
 * singleton after every test, which is what keeps sharing it safe.
 */
export const renderWithProviders = (
  ui: ReactElement,
  {
    queryClient = getQueryClient(),
    ...options
  }: RenderWithProvidersOptions = {}
) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
};
