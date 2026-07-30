import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  GENERIC_ERROR_MESSAGE,
  NETWORK_ERROR_MESSAGE,
  VALIDATION_ERROR_MESSAGE,
  getErrorMessage,
  getFieldErrors,
  getStatusCode,
} from "@/lib/api-error";

const meta = {
  correlation_id: "fca71eb84a9c4233a5fe43f5ce6421e9",
  timestamp: "2026-07-30T09:58:47.185814+00:00",
};

/** The §3 error envelope every endpoint returns for a failure. */
const errorEnvelope = (
  code: string,
  message: string,
  details: unknown = null
) => ({ success: false, error: { code, message, details }, meta });

const axiosErrorWith = (status: number, data: unknown) => {
  const config = { headers: new AxiosHeaders() };
  const error = new AxiosError("Request failed", "ERR_BAD_REQUEST", config);
  error.response = {
    status,
    statusText: "",
    headers: {},
    config,
    data,
  };
  return error;
};

describe("getErrorMessage", () => {
  it("surfaces the message the API sent inside the error envelope", () => {
    const error = axiosErrorWith(
      422,
      errorEnvelope("validation_error", "Email already in use")
    );
    expect(getErrorMessage(error)).toBe("Email already in use");
  });

  it("surfaces the access-denied message a rejected AD account must see", () => {
    const denial =
      "Access denied: your AD account is not mapped to any platform role. Contact an administrator to request access.";
    const error = axiosErrorWith(401, errorEnvelope("unauthorized", denial));
    expect(getErrorMessage(error)).toBe(denial);
  });

  it("explains a missing response as a connectivity problem", () => {
    const error = new AxiosError("Network Error", "ERR_NETWORK");
    expect(getErrorMessage(error)).toBe(NETWORK_ERROR_MESSAGE);
  });

  it("falls back to the axios message when the body is not an envelope", () => {
    const error = axiosErrorWith(500, "<html>Bad Gateway</html>");
    expect(getErrorMessage(error)).toBe("Request failed");
  });

  it("reports a schema mismatch as a data-shape problem", () => {
    const zodError = z.object({ id: z.string() }).safeParse({}).error;
    expect(getErrorMessage(zodError)).toBe(VALIDATION_ERROR_MESSAGE);
  });

  it("falls back for something that is not an Error at all", () => {
    expect(getErrorMessage("boom")).toBe(GENERIC_ERROR_MESSAGE);
  });
});

describe("getFieldErrors", () => {
  it("maps a flat string details map onto form fields", () => {
    const error = axiosErrorWith(
      422,
      errorEnvelope("validation_error", "Validation failed", {
        email: "Already in use",
      })
    );
    expect(getFieldErrors(error)).toEqual({ email: "Already in use" });
  });

  it("returns null when details is null, as it is in every documented example", () => {
    const error = axiosErrorWith(500, errorEnvelope("internal_error", "Boom"));
    expect(getFieldErrors(error)).toBeNull();
  });

  it("returns null for a details shape that is not field messages", () => {
    const error = axiosErrorWith(
      422,
      errorEnvelope("validation_error", "Bad request", {
        groups: ["Unknown AD group"],
      })
    );
    expect(getFieldErrors(error)).toBeNull();
  });

  it("returns null for a non-HTTP failure", () => {
    expect(getFieldErrors(new Error("boom"))).toBeNull();
  });
});

describe("getStatusCode", () => {
  it("reads the status off an axios error", () => {
    const error = axiosErrorWith(404, errorEnvelope("not_found", "Nope"));
    expect(getStatusCode(error)).toBe(404);
  });

  it("returns null for a non-HTTP failure", () => {
    expect(getStatusCode(new Error("boom"))).toBeNull();
  });
});
