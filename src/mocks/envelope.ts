import type { ApiMeta } from "@/lib/zod";

/**
 * The `authentication_flow.md` §3 envelope, built in one place. Every mock
 * response — success or error — goes through `ok` or `fail`, so a handler
 * cannot accidentally answer with a bare object and teach the frontend a shape
 * the real backend will never send.
 */

/** The `error.code` values §3's table pairs with each status. */
export const MOCK_ERROR_CODES = {
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  VALIDATION_ERROR: "validation_error",
  /**
   * Not in §3's table. §3 only enumerates the auth-relevant codes, and the
   * production gate needs a body for "this endpoint no longer exists" (§4).
   */
  NOT_FOUND: "not_found",
} as const;

export type MockErrorCode =
  (typeof MOCK_ERROR_CODES)[keyof typeof MOCK_ERROR_CODES];

export interface MockSuccessEnvelope<TData> {
  success: true;
  data: TData;
  meta: ApiMeta;
}

export interface MockErrorEnvelope {
  success: false;
  error: {
    code: MockErrorCode;
    message: string;
    details: unknown;
  };
  meta: ApiMeta;
}

/**
 * 32 lowercase hex characters, matching the `correlation_id` §3 shows. The real
 * backend produces it with `uuid4().hex`. `crypto.getRandomValues` is the Web
 * Crypto global — present in both the Node route-handler runtime and jsdom — so
 * this needs no dependency and no Node-only import.
 */
export const correlationId = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");

/**
 * ISO-8601 with an explicit offset. `toISOString()` ends in `Z`, which is the
 * same instant but not the spelling §3 shows (`+00:00`, what Python's
 * `datetime.isoformat()` emits). Normalising here means the frontend never has
 * to cope with two spellings of the same thing.
 */
export const nowTimestamp = (): string =>
  new Date().toISOString().replace(/Z$/, "+00:00");

const buildMeta = (): ApiMeta => ({
  correlation_id: correlationId(),
  timestamp: nowTimestamp(),
});

export const ok = <TData>(data: TData): MockSuccessEnvelope<TData> => ({
  success: true,
  data,
  meta: buildMeta(),
});

/** `details` is `null` in every §3 example; callers pass a value only when they have one. */
export const fail = (
  code: MockErrorCode,
  message: string,
  details: unknown = null
): MockErrorEnvelope => ({
  success: false,
  error: { code, message, details },
  meta: buildMeta(),
});
