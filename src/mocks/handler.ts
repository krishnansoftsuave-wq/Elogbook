import { NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";

import { DEFAULT_PAGE_SIZE } from "@/constants/api";
import type { Permission } from "@/constants/permissions";
import type { meDataSchema } from "@/features/auth/schemas";
import { hasPermission } from "@/lib/auth/permissions";
import { fieldErrorsFromZod, type Paginated } from "@/lib/zod";
import { authenticate, forbiddenMessage } from "@/mocks/auth/resolve";
import { MOCK_ERROR_CODES, fail, ok } from "@/mocks/envelope";
import { isMockApiEnabled, mockDisabledEnvelope } from "@/mocks/http";
import { mockLatency } from "@/mocks/latency";

/**
 * The four steps every mock endpoint repeats — production gate, latency,
 * authentication, permission — factored out of what would otherwise be twenty-
 * seven copies of `src/app/api/v1/shifts/current/route.ts` lines 27–48.
 *
 * Factoring it is not just tidiness. The 401/403 distinction is load-bearing
 * (§3: a 401 ends the session, a 403 leaves it intact so the caller can render a
 * permission-denied state), and one handler that got it backwards would teach
 * the frontend the wrong lesson in a way nothing else would catch. One
 * implementation, tested once.
 *
 * `shifts/current/route.ts` deliberately keeps its inline version: it is the
 * worked example the auth contract documents, and it should stay readable
 * end-to-end without following a helper.
 */

type Session = z.infer<typeof meDataSchema>;

export interface MockRouteContext {
  request: NextRequest;
  session: Session;
}

interface MockRouteConfig {
  /**
   * Permission required to reach the handler. FR-ADM-03 requires RBAC "at both
   * API and UI layers" — this is the API layer, and it is what makes hiding a
   * button not the access control.
   */
  permission?: Permission;
}

/**
 * Runs the gate chain and returns either a `Response` to send immediately or the
 * authenticated session to continue with.
 */
const guard = async (
  request: NextRequest,
  config: MockRouteConfig
): Promise<{ deny: Response } | { session: Session }> => {
  if (!isMockApiEnabled()) {
    return {
      deny: NextResponse.json(mockDisabledEnvelope(), { status: 404 }),
    };
  }

  await mockLatency();

  const result = authenticate(request.headers.get("authorization"));
  if (!result.authenticated) {
    return {
      deny: NextResponse.json(
        fail(MOCK_ERROR_CODES.UNAUTHORIZED, result.message),
        { status: 401 }
      ),
    };
  }

  if (
    config.permission &&
    !hasPermission(result.session.permissions, config.permission)
  ) {
    // 403, not 401: the token is valid and the session must survive.
    return {
      deny: NextResponse.json(
        fail(MOCK_ERROR_CODES.FORBIDDEN, forbiddenMessage(config.permission)),
        { status: 403 }
      ),
    };
  }

  return { session: result.session };
};

/** A route with no dynamic segments. */
export const mockRoute =
  (
    config: MockRouteConfig,
    handle: (context: MockRouteContext) => Promise<Response> | Response
  ) =>
  async (request: NextRequest): Promise<Response> => {
    const gate = await guard(request, config);
    if ("deny" in gate) return gate.deny;

    return handle({ request, session: gate.session });
  };

/**
 * A route with dynamic segments. `params` is a `Promise` in Next 16 — see
 * `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`,
 * which records the change at v15.0.0-RC. The explicit
 * `{ params: Promise<T> }` form is used rather than the global `RouteContext<>`
 * helper because that helper's types are emitted by `next dev` / `next build` /
 * `next typegen`, and `npm run type-check` runs `tsc --noEmit` on its own.
 */
export const mockRouteWithParams =
  <TParams extends Record<string, string>>(
    config: MockRouteConfig,
    handle: (
      context: MockRouteContext & { params: TParams }
    ) => Promise<Response> | Response
  ) =>
  async (
    request: NextRequest,
    context: { params: Promise<TParams> }
  ): Promise<Response> => {
    const gate = await guard(request, config);
    if ("deny" in gate) return gate.deny;

    return handle({
      request,
      session: gate.session,
      params: await context.params,
    });
  };

/* -------------------------------------------------------------------------- */
/* Response helpers                                                            */
/* -------------------------------------------------------------------------- */

export const okJson = <TData>(data: TData, status = 200): Response =>
  NextResponse.json(ok(data), { status });

export const notFound = (what: string): Response =>
  NextResponse.json(
    fail(MOCK_ERROR_CODES.NOT_FOUND, `${what} was not found.`),
    { status: 404 }
  );

export const forbidden = (message: string): Response =>
  NextResponse.json(fail(MOCK_ERROR_CODES.FORBIDDEN, message), {
    status: 403,
  });

/** The request is well-formed and permitted but conflicts with the resource's current state. */
export const conflict = (message: string): Response =>
  NextResponse.json(fail(MOCK_ERROR_CODES.CONFLICT, message), {
    status: 409,
  });

/**
 * §4's 422 shape, matching what `POST /dev/token` already answers with:
 * `validation_error` plus per-field details. `fieldErrorsFromZod` is the same
 * flattener the forms use, so a client sees one error shape everywhere.
 */
export const validationError = (error: z.ZodError): Response =>
  NextResponse.json(
    fail(
      MOCK_ERROR_CODES.VALIDATION_ERROR,
      "The request body failed validation.",
      fieldErrorsFromZod(error)
    ),
    { status: 422 }
  );

/**
 * Reads and validates a JSON body.
 *
 * A body that is not JSON at all is a 422, not a thrown 500 — `routes.test.ts`
 * already pins that behaviour for `/dev/token` and the rest should not differ.
 */
export const readJson = async <TSchema extends z.ZodType>(
  request: NextRequest,
  schema: TSchema
): Promise<
  { ok: true; data: z.infer<TSchema> } | { ok: false; response: Response }
> => {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        fail(
          MOCK_ERROR_CODES.VALIDATION_ERROR,
          "Request body must be valid JSON."
        ),
        { status: 422 }
      ),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, response: validationError(parsed.error) };
  }

  return { ok: true, data: parsed.data };
};

/* -------------------------------------------------------------------------- */
/* Pagination                                                                  */
/* -------------------------------------------------------------------------- */

const MAX_PAGE_SIZE = 100;

const positiveInt = (
  value: string | null,
  fallback: number,
  max: number
): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

/**
 * Slices a collection into the `paginatedSchema` shape (`lib/zod.ts`).
 *
 * Server-side pagination is the default in this repo (AGENTS.md §6), so the mock
 * has to actually paginate — a mock that returns everything and lets the table
 * slice it would let a client ship with `manualPagination` wired wrongly and
 * never notice until the real backend truncated the list.
 *
 * Out-of-range pages return an empty `items` with the true `total`, which is
 * what lets a table show "page 9 of 2" rather than silently snapping to page 1.
 */
export const paginate = <TItem>(
  items: readonly TItem[],
  searchParams: URLSearchParams
): Paginated<TItem> => {
  const page = positiveInt(
    searchParams.get("page"),
    1,
    Number.MAX_SAFE_INTEGER
  );
  const pageSize = positiveInt(
    searchParams.get("pageSize"),
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE
  );
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  };
};

/** Case-insensitive "does any of these fields contain the search term". */
export const matchesSearch = (
  search: string | null,
  ...fields: readonly string[]
): boolean => {
  const term = search?.trim().toLowerCase();
  if (!term) return true;
  return fields.some((field) => field.toLowerCase().includes(term));
};
