/**
 * The AD side of the mock: who exists, and which groups they carry. Group names
 * are literals here because they *are* the fixture data — `directory.test.ts`
 * checks every one of them against `AD_GROUP_TO_ROLE` so a typo cannot sit here
 * silently pretending to be an entitlement.
 */
export interface MockAccount {
  /** Stands in for the AD `preferred_username` claim. */
  username: string;
  /** Stands in for the AD `name` claim. */
  displayName: string;
  /** Raw AD group memberships, exactly as a real token would carry them. */
  groups: readonly string[];
  /** Why this account is in the set — each one covers a distinct branch. */
  note: string;
}

export const MOCK_ACCOUNTS: readonly MockAccount[] = [
  {
    username: "said.albusaidi",
    displayName: "Said Al-Busaidi",
    groups: ["OLNG-ELOG-OPERATORS"],
    note: "Operator — §5's worked example: one group, one role.",
  },
  {
    username: "fatma.alharthy",
    displayName: "Fatma Al-Harthy",
    groups: ["OLNG-ELOG-SUPERVISORS"],
    note: "Supervisor — adds summary:comment, action:confirm/assign and report:read over operator.",
  },
  {
    username: "khalid.almamari",
    displayName: "Khalid Al-Mamari",
    groups: ["OLNG-ELOG-SUPERINTENDENTS"],
    note: "Management — the only base role holding analytics:read.",
  },
  {
    username: "noura.alkindi",
    displayName: "Noura Al-Kindi",
    groups: ["OLNG-ELOG-ADMINS"],
    note: 'Administrator — permissions resolve to the bare wildcard ["*"], never an expanded list.',
  },
  {
    username: "yousuf.alrawahi",
    displayName: "Yousuf Al-Rawahi",
    groups: ["OLNG-ELOG-SUPERUSERS"],
    note: "Super User — holds user:read but no shift:read, so it is the account that produces a 403.",
  },
  {
    username: "maryam.alzadjali",
    displayName: "Maryam Al-Zadjali",
    groups: ["OLNG-ELOG-OPERATORS", "OLNG-ELOG-SUPERINTENDENTS"],
    note: "Multi-group — exercises FR-AUTH-03: permissions are the union of both roles.",
  },
  {
    username: "hamed.alsiyabi",
    displayName: "Hamed Al-Siyabi",
    groups: ["OLNG-CONTRACTORS"],
    note:
      "Unmapped — exists in AD, entitled to nothing, so /me answers §5's 401 deny. " +
      "Note this account CANNOT obtain a token from POST /dev/token: §4 rejects any " +
      "group outside the roles table with a 422 first. Mint its token directly with " +
      "mintMockToken() to drive the deny path. See resolve.test.ts.",
  },
] as const;

/**
 * Who the sign-in button signs you in as.
 *
 * The mock AD FS account picker is gone — the button goes straight to the
 * callback, which is where real AD FS lands the browser once somebody has
 * authenticated. One identity has to be the default, and the Operator has the
 * fullest operational surface: dashboard, actions, summaries, assistant and
 * notifications all open for it. `DevRoleSwitcher` in the sidebar footer is how
 * you become anybody else.
 */
export const DEFAULT_MOCK_ACCOUNT = "said.albusaidi";

export const findMockAccount = (username: string): MockAccount | undefined =>
  MOCK_ACCOUNTS.find((account) => account.username === username);
