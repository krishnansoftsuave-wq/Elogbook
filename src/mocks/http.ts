import { MOCK_ERROR_CODES, fail } from "@/mocks/envelope";

/**
 * The mock transport exists only outside production. §4 is explicit that
 * `/dev/token` "will 404 the moment real AD FS is wired in" — so 404, not 403,
 * is the contract-accurate answer for a build that should never carry a stub.
 *
 * `process.env.NODE_ENV` is substituted with a string literal at build time, so
 * in a production bundle this body reads `"production" !== "production"` and
 * folds to a constant `false`. There is no runtime switch and no
 * `NEXT_PUBLIC_*` flag to flip: a production build cannot serve the mock.
 */
export const isMockApiEnabled = (): boolean =>
  process.env.NODE_ENV !== "production";

/** Body for a gated-off handler. Enveloped, because §3 admits no bare responses. */
export const mockDisabledEnvelope = () =>
  fail(MOCK_ERROR_CODES.NOT_FOUND, "Not Found");
