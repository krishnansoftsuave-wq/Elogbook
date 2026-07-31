import type { RequestStatus, RequestWire } from "@/features/requests/schemas";
import { daysFromBase } from "@/mocks/data/clock";
import { actor, PEOPLE } from "@/mocks/data/people";

/**
 * `state.requests`, app-source.txt 61–72 — an access-request / helpdesk queue.
 *
 * ⚠️ **PROTOTYPE-ONLY — no BRD basis.** This entity appears in no functional
 * requirement, no persona flow (§6) and no scope table (§3) of BRD v1.3. It was
 * searched for, not assumed missing.
 *
 * Owner decision, 2026-07-31: **defer**. The contract is written so Phase 2 is
 * unblocked the moment OLNG confirms the feature, but **no screen is built** —
 * `requests` (1519–1535), `requestDetail` (1536–1555) and `reqModal` (1825) are
 * out of scope. Do not cite an FR-ID for any of this; there is none to cite.
 *
 * PROVISIONAL field names, like every entity here — and provisional existence
 * on top of that.
 */

interface RequestSeed {
  id: string;
  subject: string;
  description: string;
  by: string;
  role: string;
  daysAgo: number;
  status: RequestStatus;
  remark: string | null;
}

const SEEDS: readonly RequestSeed[] = [
  {
    id: "REQ-1048",
    subject: "Access to historian trend export",
    description:
      "Requesting export permission for PI historian trends for monthly reporting.",
    by: PEOPLE.MULTI_ROLE,
    role: "Operator",
    daysAgo: 1,
    status: "in_review",
    remark: null,
  },
  {
    id: "REQ-1047",
    subject: "Reset MFA device",
    description: "Lost phone — need MFA re-enrolment for platform sign-in.",
    by: PEOPLE.SUPERVISOR,
    role: "Supervisor",
    daysAgo: 1,
    status: "in_review",
    remark: null,
  },
  {
    id: "REQ-1046",
    subject: "Add Unit 3 to summary scope",
    description:
      "Please include Unit 3 activities in my generated shift summaries.",
    by: PEOPLE.ADMINISTRATOR,
    role: "Administrator",
    daysAgo: 2,
    status: "in_review",
    remark: null,
  },
  {
    id: "REQ-1045",
    subject: "Add Utilities area to my dashboard",
    description:
      "Please enable the Utilities KPI widget on my Supervisor dashboard.",
    by: PEOPLE.OPERATOR,
    role: "Operator",
    daysAgo: 2,
    status: "resolved",
    remark: "Enabled in role config.",
  },
  {
    id: "REQ-1044",
    subject: "Export permission for safety reports",
    description: "Need PDF export rights for the monthly HSSE board pack.",
    by: PEOPLE.ADMINISTRATOR,
    role: "Administrator",
    daysAgo: 3,
    status: "in_review",
    remark: null,
  },
  {
    id: "REQ-1043",
    subject: "Correct equipment tag FT-330",
    description:
      "Tag description mismatch in logbook dropdown — shows old range.",
    by: PEOPLE.MULTI_ROLE,
    role: "Operator",
    daysAgo: 3,
    status: "resolved",
    remark: "Tag metadata updated.",
  },
  {
    id: "REQ-1042",
    subject: "Grant Reports module access",
    description: "Requesting view access to Trends & KPIs for shift planning.",
    by: PEOPLE.OPERATOR,
    role: "Operator",
    daysAgo: 4,
    status: "resolved",
    remark: "Granted read-only access.",
  },
  {
    id: "REQ-1041",
    subject: "New AD group mapping for contractors",
    description: "Map ELOGBOOK_CONTRACTOR group to a restricted operator role.",
    by: PEOPLE.MANAGEMENT,
    role: "Management",
    daysAgo: 5,
    status: "in_review",
    remark: null,
  },
  {
    id: "REQ-1040",
    subject: "Increase dashboard widget limit",
    description: "Request to allow 8 widgets on the Management dashboard.",
    by: PEOPLE.MANAGEMENT,
    role: "Management",
    daysAgo: 6,
    status: "rejected",
    remark: "Exceeds layout policy — capped at 6.",
  },
  {
    id: "REQ-1039",
    subject: "Enable Arabic assistant responses",
    description: "Please enable Arabic language output for Ask Assistant.",
    by: PEOPLE.SUPERVISOR,
    role: "Supervisor",
    daysAgo: 7,
    status: "resolved",
    remark: "Already supported — enabled per language of question.",
  },
  {
    id: "REQ-1038",
    subject: "Shift timing correction",
    description: "Night shift end should be 06:00 not 05:45 in my summaries.",
    by: PEOPLE.SUPER_USER,
    role: "Super User",
    daysAgo: 8,
    status: "resolved",
    remark: "Corrected in Configuration.",
  },
];

export const seedRequests = (base: Date): RequestWire[] =>
  SEEDS.map((seed) => ({
    id: seed.id,
    subject: seed.subject,
    description: seed.description,
    submitted_by: actor(seed.by),
    submitted_by_role: seed.role,
    submitted_at: daysFromBase(-seed.daysAgo, base),
    status: seed.status,
    remarks: seed.remark
      ? [
          {
            id: `${seed.id}-R1`,
            author: actor(PEOPLE.ADMINISTRATOR),
            body: seed.remark,
            created_at: daysFromBase(-seed.daysAgo + 0.5, base),
          },
        ]
      : [],
  }));
