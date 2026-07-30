import { describe, expect, it } from "vitest";

import { apiErrorSchema, envelopeSchema } from "@/lib/zod";
import {
  MOCK_ERROR_CODES,
  correlationId,
  fail,
  nowTimestamp,
  ok,
} from "@/mocks/envelope";
import { z } from "zod";

/**
 * The point of these assertions is wire parity: what the mock builds must be
 * what the client's own schemas accept. Parsing with `envelopeSchema` and
 * `apiErrorSchema` — the very schemas the query hooks and `getErrorMessage`
 * use — is what makes that a test rather than a hope.
 */
describe("ok", () => {
  it("produces a §3 success envelope the client's envelopeSchema accepts", () => {
    const envelope = ok({ status: "ok" });

    const parsed = envelopeSchema(z.object({ status: z.string() })).safeParse(
      envelope
    );
    expect(parsed.success).toBe(true);
  });

  it("carries the data through untouched", () => {
    expect(ok({ access_token: "abc", expires_in: 900 }).data).toEqual({
      access_token: "abc",
      expires_in: 900,
    });
  });

  it("sets success to the literal true", () => {
    expect(ok(null).success).toBe(true);
  });
});

describe("fail", () => {
  it("produces a §3 error envelope the client's apiErrorSchema accepts", () => {
    const envelope = fail(MOCK_ERROR_CODES.UNAUTHORIZED, "Access denied.");

    const parsed = apiErrorSchema.safeParse(envelope);
    expect(parsed.success).toBe(true);
  });

  it("nests code and message under `error`, as §3 shows", () => {
    const envelope = fail(MOCK_ERROR_CODES.FORBIDDEN, "Nope.");

    expect(envelope.success).toBe(false);
    expect(envelope.error.code).toBe("forbidden");
    expect(envelope.error.message).toBe("Nope.");
  });

  it("defaults details to null, which is what every §3 example shows", () => {
    expect(fail(MOCK_ERROR_CODES.UNAUTHORIZED, "No.").error.details).toBeNull();
  });

  it("passes details through when given, so getFieldErrors can read them", () => {
    const details = { username: "Enter a username" };

    expect(
      fail(MOCK_ERROR_CODES.VALIDATION_ERROR, "Invalid.", details).error.details
    ).toEqual(details);
  });

  it("uses exactly the error codes §3's table pairs with each status", () => {
    expect(MOCK_ERROR_CODES.UNAUTHORIZED).toBe("unauthorized");
    expect(MOCK_ERROR_CODES.FORBIDDEN).toBe("forbidden");
    expect(MOCK_ERROR_CODES.VALIDATION_ERROR).toBe("validation_error");
  });
});

describe("meta", () => {
  it("gives every response a fresh correlation id", () => {
    expect(ok(1).meta.correlation_id).not.toBe(ok(1).meta.correlation_id);
  });

  it("formats the correlation id as 32 lowercase hex characters, per §3's example", () => {
    expect(correlationId()).toMatch(/^[0-9a-f]{32}$/);
  });

  it("timestamps with an explicit +00:00 offset rather than a bare Z", () => {
    const timestamp = nowTimestamp();

    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+\+00:00$/);
    expect(timestamp.endsWith("Z")).toBe(false);
  });

  it("emits a timestamp Date can read back to the same instant", () => {
    const before = Date.now();
    const parsed = new Date(nowTimestamp()).getTime();

    expect(parsed).toBeGreaterThanOrEqual(before - 1000);
    expect(parsed).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it("attaches meta to errors as well as successes", () => {
    expect(
      fail(MOCK_ERROR_CODES.UNAUTHORIZED, "No.").meta.correlation_id
    ).toMatch(/^[0-9a-f]{32}$/);
  });
});
