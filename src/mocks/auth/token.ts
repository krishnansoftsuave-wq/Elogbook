import { z } from "zod";

/**
 * THIS IS NOT A JWT AND IT IS NOT SECURE.
 *
 * It is a base64url-encoded JSON blob with no signature, no issuer and no
 * audience. Anyone can decode it, and anyone can forge one — which is fine,
 * because it never leaves a developer machine: every handler under
 * `src/app/api/` 404s in a production build (`src/mocks/http.ts`). It exists so
 * the frontend can exercise the real `Authorization: Bearer …` path end to end
 * before AD FS is wired in (tracker A-01).
 *
 * CUTOVER: `decodeMockToken` is the one function that changes. It becomes a
 * signature / issuer / audience verification against the AD FS JWKS. The
 * payload field names below already mirror the claims AD FS sends, so nothing
 * that calls it moves — see `resolveSession` in `./resolve.ts`.
 */

/** §4: "900s = 15 minutes today". Seconds, not milliseconds. */
export const MOCK_TOKEN_TTL_SECONDS = 900;

/**
 * Parsed rather than cast, because a decoded token is untrusted input: it
 * arrives from the network and nothing about it is signed.
 */
const mockTokenPayloadSchema = z.object({
  subject: z.string(),
  username: z.string(),
  display_name: z.string(),
  groups: z.array(z.string()),
  /** Issued-at / expires-at, seconds since the epoch, as JWT `iat`/`exp`. */
  iat: z.number().int(),
  exp: z.number().int(),
});

export type MockTokenPayload = z.infer<typeof mockTokenPayloadSchema>;

/** §5's example subject form: `dev|jane.operator`. */
export const mockSubject = (username: string): string => `dev|${username}`;

const nowInSeconds = (): number => Math.floor(Date.now() / 1000);

export const encodeMockToken = (payload: MockTokenPayload): string =>
  Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

/** Returns `null` for anything that is not a well-formed payload — never throws. */
export const decodeMockToken = (token: string): MockTokenPayload | null => {
  try {
    const json = Buffer.from(token, "base64url").toString("utf8");
    const parsed = mockTokenPayloadSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

export const isTokenExpired = (
  payload: MockTokenPayload,
  atSeconds: number = nowInSeconds()
): boolean => payload.exp <= atSeconds;

export interface MintMockTokenInput {
  username: string;
  displayName: string;
  groups: readonly string[];
  /** Overridable so tests can mint an already-expired token deterministically. */
  issuedAt?: number;
}

/** The §4 `200` payload: `{ access_token, token_type, expires_in }`. */
export interface MockTokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
}

export const mintMockToken = ({
  username,
  displayName,
  groups,
  issuedAt = nowInSeconds(),
}: MintMockTokenInput): MockTokenResponse => ({
  access_token: encodeMockToken({
    subject: mockSubject(username),
    username,
    display_name: displayName,
    groups: [...groups],
    iat: issuedAt,
    exp: issuedAt + MOCK_TOKEN_TTL_SECONDS,
  }),
  token_type: "Bearer",
  expires_in: MOCK_TOKEN_TTL_SECONDS,
});
