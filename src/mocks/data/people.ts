import type { ActorWire } from "@/types/actor";
import { findMockAccount, MOCK_ACCOUNTS } from "@/mocks/auth/directory";

/**
 * The cast every fixture draws from — and the reason it exists.
 *
 * The prototype's records are authored by "A. Harthy", "S. Balushi", "K. Said"
 * (app-source.txt 41–54, 87, 114). None of those are accounts you can sign in
 * as: `MOCK_ACCOUNTS` (mocks/auth/directory.ts) knows Said Al-Busaidi, Fatma
 * Al-Harthy and four others. Seeding the prototype's names verbatim would
 * produce a demo where you sign in as Fatma Al-Harthy and are shown a list of
 * actions raised by people who do not exist, with an owner you can never be.
 *
 * So every `created_by`, `owner` and `raised_by` in the fixtures resolves
 * through here, and `people.test.ts` asserts each one is a real directory
 * account. A typo becomes a failing test rather than a ghost in the demo.
 */
export const PEOPLE = {
  OPERATOR: "said.albusaidi",
  SUPERVISOR: "fatma.alharthy",
  MANAGEMENT: "khalid.almamari",
  ADMINISTRATOR: "noura.alkindi",
  SUPER_USER: "yousuf.alrawahi",
  /** Holds Operator *and* Management — FR-AUTH-03's permission union. */
  MULTI_ROLE: "maryam.alzadjali",
} as const;

export type PersonKey = (typeof PEOPLE)[keyof typeof PEOPLE];

/**
 * Throws rather than falling back to the username. A fixture naming an account
 * that does not exist is an authoring mistake, and a silent fallback would let
 * it reach the demo looking like a real person.
 */
export const actor = (username: PersonKey | string): ActorWire => {
  const account = findMockAccount(username);
  if (!account) {
    throw new Error(
      `Mock fixture references unknown account "${username}". ` +
        `Known accounts: ${MOCK_ACCOUNTS.map((a) => a.username).join(", ")}`
    );
  }
  return { username: account.username, display_name: account.displayName };
};

/** Everyone a fixture may name — the unmapped account is deliberately absent. */
export const SEEDABLE_PEOPLE: readonly PersonKey[] = Object.values(PEOPLE);
