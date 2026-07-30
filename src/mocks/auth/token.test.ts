import { describe, expect, it } from "vitest";

import { devTokenDataSchema } from "@/features/auth/schemas";
import {
  MOCK_TOKEN_TTL_SECONDS,
  decodeMockToken,
  encodeMockToken,
  isTokenExpired,
  mintMockToken,
  mockSubject,
  type MockTokenPayload,
} from "@/mocks/auth/token";

const payload: MockTokenPayload = {
  subject: "dev|said.albusaidi",
  username: "said.albusaidi",
  display_name: "Said Al-Busaidi",
  groups: ["OLNG-ELOG-OPERATORS"],
  iat: 1_800_000_000,
  exp: 1_800_000_900,
};

describe("encodeMockToken / decodeMockToken", () => {
  it("round-trips a payload unchanged", () => {
    expect(decodeMockToken(encodeMockToken(payload))).toEqual(payload);
  });

  it("survives non-ASCII display names, which a bilingual product will carry", () => {
    const arabic = { ...payload, display_name: "سعيد البوسعيدي" };

    expect(decodeMockToken(encodeMockToken(arabic))?.display_name).toBe(
      "سعيد البوسعيدي"
    );
  });

  it("emits base64url, so the token is safe in a header without escaping", () => {
    expect(encodeMockToken(payload)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("returns null rather than throwing for a token that is not base64 JSON", () => {
    expect(decodeMockToken("not-a-token")).toBeNull();
    expect(decodeMockToken("")).toBeNull();
    expect(decodeMockToken("!!!!")).toBeNull();
  });

  it("returns null for well-formed JSON that is not a token payload", () => {
    const notAToken = Buffer.from(JSON.stringify({ hello: "world" })).toString(
      "base64url"
    );

    expect(decodeMockToken(notAToken)).toBeNull();
  });

  it("returns null when a required claim is missing", () => {
    const { exp: _exp, ...withoutExp } = payload;
    const truncated = Buffer.from(JSON.stringify(withoutExp)).toString(
      "base64url"
    );

    expect(decodeMockToken(truncated)).toBeNull();
  });
});

describe("isTokenExpired", () => {
  it("treats a token as live before its exp", () => {
    expect(isTokenExpired(payload, payload.exp - 1)).toBe(false);
  });

  it("treats a token as expired at and after its exp", () => {
    expect(isTokenExpired(payload, payload.exp)).toBe(true);
    expect(isTokenExpired(payload, payload.exp + 1)).toBe(true);
  });
});

describe("mintMockToken", () => {
  it("returns the §4 response shape the client's schema accepts", () => {
    const minted = mintMockToken({
      username: "said.albusaidi",
      displayName: "Said Al-Busaidi",
      groups: ["OLNG-ELOG-OPERATORS"],
    });

    expect(devTokenDataSchema.safeParse(minted).success).toBe(true);
    expect(minted.token_type).toBe("Bearer");
  });

  it("expires in 900 seconds, per §4", () => {
    const minted = mintMockToken({
      username: "said.albusaidi",
      displayName: "Said Al-Busaidi",
      groups: ["OLNG-ELOG-OPERATORS"],
      issuedAt: 1_800_000_000,
    });

    expect(minted.expires_in).toBe(900);
    expect(MOCK_TOKEN_TTL_SECONDS).toBe(900);
    expect(decodeMockToken(minted.access_token)?.exp).toBe(1_800_000_900);
  });

  it("builds the subject in §5's `dev|<username>` form", () => {
    const minted = mintMockToken({
      username: "noura.alkindi",
      displayName: "Noura Al-Kindi",
      groups: ["OLNG-ELOG-ADMINS"],
    });

    expect(decodeMockToken(minted.access_token)?.subject).toBe(
      "dev|noura.alkindi"
    );
    expect(mockSubject("noura.alkindi")).toBe("dev|noura.alkindi");
  });

  it("carries the groups it was given into the token", () => {
    const minted = mintMockToken({
      username: "maryam.alzadjali",
      displayName: "Maryam Al-Zadjali",
      groups: ["OLNG-ELOG-OPERATORS", "OLNG-ELOG-SUPERINTENDENTS"],
    });

    expect(decodeMockToken(minted.access_token)?.groups).toEqual([
      "OLNG-ELOG-OPERATORS",
      "OLNG-ELOG-SUPERINTENDENTS",
    ]);
  });

  it("mints an already-expired token when issuedAt is far enough back", () => {
    const minted = mintMockToken({
      username: "said.albusaidi",
      displayName: "Said Al-Busaidi",
      groups: ["OLNG-ELOG-OPERATORS"],
      issuedAt: Math.floor(Date.now() / 1000) - MOCK_TOKEN_TTL_SECONDS - 60,
    });
    const decoded = decodeMockToken(minted.access_token);

    expect(decoded).not.toBeNull();
    expect(decoded && isTokenExpired(decoded)).toBe(true);
  });
});
