import { describe, expect, it } from "vitest";

import { AD_GROUP_TO_ROLE } from "@/constants/roles";
import {
  MOCK_ACCOUNTS,
  findMockAccount,
  type MockAccount,
} from "@/mocks/auth/directory";
import { resolveSession, unknownGroups } from "@/mocks/auth/resolve";
import { MOCK_TOKEN_TTL_SECONDS, mockSubject } from "@/mocks/auth/token";

const payloadFor = (account: MockAccount) => {
  const iat = Math.floor(Date.now() / 1000);
  return {
    subject: mockSubject(account.username),
    username: account.username,
    display_name: account.displayName,
    groups: [...account.groups],
    iat,
    exp: iat + MOCK_TOKEN_TTL_SECONDS,
  };
};

const UNMAPPED_USERNAME = "hamed.alsiyabi";

const entitledAccounts = MOCK_ACCOUNTS.filter(
  (account) => account.username !== UNMAPPED_USERNAME
);

describe("MOCK_ACCOUNTS", () => {
  it("gives every account a distinct username", () => {
    const usernames = MOCK_ACCOUNTS.map((account) => account.username);

    expect(new Set(usernames).size).toBe(usernames.length);
  });

  it("gives every account a display name and at least one group", () => {
    for (const account of MOCK_ACCOUNTS) {
      expect(account.displayName.length).toBeGreaterThan(0);
      expect(account.groups.length).toBeGreaterThan(0);
    }
  });

  /**
   * Group names are literals in the fixture, so this is what stops a typo
   * sitting there looking like an entitlement it is not.
   */
  it("spells every entitled account's groups exactly as AD_GROUP_TO_ROLE does", () => {
    for (const account of entitledAccounts) {
      expect(unknownGroups(account.groups)).toEqual([]);
    }
  });

  it("covers all five §6 roles across the entitled accounts", () => {
    const roles = entitledAccounts.flatMap(
      (account) => resolveSession(payloadFor(account))?.roles ?? []
    );

    expect(new Set(roles)).toEqual(new Set(Object.values(AD_GROUP_TO_ROLE)));
  });

  it("includes a multi-group account so the FR-AUTH-03 union is exercised", () => {
    const multiGroup = MOCK_ACCOUNTS.filter(
      (account) => account.groups.length > 1
    );

    expect(multiGroup.length).toBeGreaterThan(0);
    for (const account of multiGroup) {
      expect(resolveSession(payloadFor(account))?.roles.length).toBeGreaterThan(
        1
      );
    }
  });

  it("resolves every entitled account to a session with at least one permission", () => {
    for (const account of entitledAccounts) {
      const session = resolveSession(payloadFor(account));

      expect(session).not.toBeNull();
      expect(session?.permissions.length).toBeGreaterThan(0);
    }
  });
});

describe("the unmapped account", () => {
  it("exists, so the §5 deny path has a fixture to drive it", () => {
    expect(findMockAccount(UNMAPPED_USERNAME)).toBeDefined();
  });

  it("resolves to no session at all, rather than to zero permissions", () => {
    const account = findMockAccount(UNMAPPED_USERNAME);

    expect(account).toBeDefined();
    expect(account && resolveSession(payloadFor(account))).toBeNull();
  });

  /**
   * Pinning the contract tension in a test rather than only in prose: §4
   * validates groups against the roles table, so this account cannot obtain a
   * token through POST /dev/token. Its token has to be minted directly.
   */
  it("cannot pass §4's group validation, so /dev/token would 422 it", () => {
    const account = findMockAccount(UNMAPPED_USERNAME);

    expect(account && unknownGroups(account.groups).length).toBeGreaterThan(0);
  });
});

describe("findMockAccount", () => {
  it("finds an account by username", () => {
    expect(findMockAccount("said.albusaidi")?.displayName).toBe(
      "Said Al-Busaidi"
    );
  });

  it("returns undefined for an unknown username", () => {
    expect(findMockAccount("nobody.here")).toBeUndefined();
  });
});
