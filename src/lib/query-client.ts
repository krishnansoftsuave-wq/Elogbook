import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/api-error";

/**
 * Read errors are toasted here, once, for the whole app. Call sites must not
 * wrap `useQuery` in try/catch. Opt a query out with
 * `meta: { suppressErrorToast: true }`.
 */
const makeQueryClient = () =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.meta?.suppressErrorToast === true) return;
        toast.error(getErrorMessage(error));
      },
    }),
    mutationCache: new MutationCache({
      // Mutations opt into their own onError; this only catches the ones that
      // do not, so a failed write is never silent.
      onError: (error, _variables, _context, mutation) => {
        if (mutation.options.onError) return;
        if (mutation.meta?.suppressErrorToast === true) return;
        toast.error(getErrorMessage(error));
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });

let browserQueryClient: QueryClient | undefined;

/**
 * One client per browser session; a fresh one per server render so requests
 * never share a cache.
 */
export const getQueryClient = (): QueryClient => {
  if (typeof window === "undefined") return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
};
