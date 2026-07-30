import { isAxiosError } from "axios";
import { ZodError, z } from "zod";

import { apiErrorSchema } from "@/lib/zod";

/** `error.details` carries field messages only when it is a flat string map. */
const fieldErrorsSchema = z.record(z.string(), z.string());

export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";
export const NETWORK_ERROR_MESSAGE =
  "Cannot reach the server. Check your connection and try again.";
export const VALIDATION_ERROR_MESSAGE =
  "The server returned data in an unexpected format.";

/**
 * Turns anything thrown by the API pipeline into a sentence a user can read.
 * Used by the global `QueryCache.onError` toast and by mutation `onError`
 * handlers that do not need a bespoke message.
 */
export const getErrorMessage = (error: unknown): string => {
  if (isAxiosError(error)) {
    if (!error.response) return NETWORK_ERROR_MESSAGE;
    const parsed = apiErrorSchema.safeParse(error.response.data);
    // The API writes messages meant to be read, e.g. the §5 "your AD account is
    // not mapped to any platform role" deny. Surface it rather than "Request
    // failed with status code 401".
    if (parsed.success) return parsed.data.error.message;
    return error.message || GENERIC_ERROR_MESSAGE;
  }

  // A ZodError here means the response did not match the feature's schema.
  if (error instanceof ZodError) return VALIDATION_ERROR_MESSAGE;

  if (error instanceof Error && error.message) return error.message;

  return GENERIC_ERROR_MESSAGE;
};

/** Per-field messages returned by the API, for mapping onto a form. */
export const getFieldErrors = (
  error: unknown
): Record<string, string> | null => {
  if (!isAxiosError(error) || !error.response) return null;
  const parsed = apiErrorSchema.safeParse(error.response.data);
  if (!parsed.success) return null;
  const fields = fieldErrorsSchema.safeParse(parsed.data.error.details);
  return fields.success ? fields.data : null;
};

export const getStatusCode = (error: unknown): number | null => {
  if (!isAxiosError(error)) return null;
  return error.response?.status ?? null;
};
