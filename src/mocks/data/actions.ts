import type {
  ActionCommentWire,
  ActionWire,
  SuggestionWire,
} from "@/features/actions/schemas";
import { hoursFromBase } from "@/mocks/data/clock";
import { actor, PEOPLE } from "@/mocks/data/people";
import type {
  ActionCategory,
  ActionSource,
  ActionStatus,
  Priority,
} from "@/types/operations";

/**
 * `state.actions`, app-source.txt 41–54, all fourteen rows — translated, not
 * pasted. Four translations happen here, each of them a decision:
 *
 * 1. **Status.** The prototype's `Overdue` is not one of FR-PA-04's six states.
 *    Both `Overdue` rows (ACT-2041, ACT-2013) become `open` with a due date in
 *    the past, so `isActionOverdue` derives the flag FR-PA-06 asks for. Nothing
 *    is lost and the lifecycle stays the BRD's.
 * 2. **Dates.** Display strings → ISO offsets relative to seed time. See
 *    `clock.ts` for why.
 * 3. **People.** Display names → `MOCK_ACCOUNTS` identities. The prototype's
 *    cast maps onto the directory almost one to one: A. Harthy → Fatma
 *    Al-Harthy, N. Kindi → Noura Al-Kindi, S. Balushi → Said Al-Busaidi,
 *    M. Raisi → Khalid Al-Mamari, K. Said → Maryam Al-Zadjali.
 * 4. **Owner.** Promoted from the side map `state.owners` (line 87) onto the
 *    record, because FR-PA-03 lists owner among the fields an action *records*.
 *
 * On owners and FR-PA-05: the field is populated here even though the Supervisor
 * action workflow seeds **disabled**. Those are different things — FR-PA-03
 * makes owner a recorded attribute, while FR-PA-05 gates *assigning* one. The
 * gate belongs on the mutation (and it is there), not on whether the column can
 * hold a value.
 *
 * The wire shape itself lives in `features/actions/schemas.ts` — the contract
 * outlives this file, which is deleted at cutover. Typing the seed as `ActionWire`
 * means a field rename in the schema breaks the fixture at compile time rather
 * than at demo time.
 */

interface ActionSeed {
  id: string;
  title: string;
  area: string;
  equipment: string;
  priority: Priority;
  status: ActionStatus;
  source: ActionSource;
  category: ActionCategory;
  description: string;
  /** Hours from seed time; negative is overdue. */
  dueIn: number;
  createdBy: string;
  owner: string | null;
}

const SEEDS: readonly ActionSeed[] = [
  {
    id: "ACT-2041",
    title: "Relief valve XV-118 set-pressure verification",
    area: "B-train",
    equipment: "XV-118",
    priority: "critical",
    status: "open",
    source: "ai_suggested",
    category: "safety",
    description:
      "Relief valve XV-118 flagged during B-train walkdown — confirm set pressure and check for passing. Coordinate isolation with panel before testing.",
    dueIn: -30,
    createdBy: PEOPLE.SUPERVISOR,
    owner: PEOPLE.SUPERVISOR,
  },
  {
    id: "ACT-2038",
    title: "Lube oil pump P-204 vibration check",
    area: "B-train",
    equipment: "P-204",
    priority: "high",
    status: "in_progress",
    source: "handover",
    category: "maintenance",
    description:
      "Vibration trend on P-204 exceeded alert threshold over last three shifts. Verify alignment and bearing condition.",
    dueIn: 18,
    createdBy: PEOPLE.OPERATOR,
    owner: PEOPLE.OPERATOR,
  },
  {
    id: "ACT-2035",
    title: "FT-330 flow transmitter calibration",
    area: "Unit 3",
    equipment: "FT-330",
    priority: "medium",
    status: "on_hold",
    source: "manual",
    category: "process",
    description:
      "Flow transmitter FT-330 drift of 2.1% against mass balance. Schedule calibration with instrumentation.",
    dueIn: 48,
    createdBy: PEOPLE.MULTI_ROLE,
    owner: PEOPLE.MULTI_ROLE,
  },
  {
    id: "ACT-2031",
    title: "C-101 compressor seal inspection",
    area: "Utilities",
    equipment: "C-101",
    priority: "low",
    status: "open",
    source: "alarm",
    category: "maintenance",
    description:
      "Routine dry-gas seal inspection on C-101 following minor seal-gas flow fluctuation.",
    dueIn: 96,
    createdBy: PEOPLE.MANAGEMENT,
    owner: PEOPLE.MANAGEMENT,
  },
  {
    id: "ACT-2028",
    title: "Nitrogen purge line leak survey",
    area: "Utilities",
    equipment: "—",
    priority: "medium",
    status: "completed",
    source: "safety_observation",
    category: "environmental",
    description:
      "Leak survey on nitrogen purge header completed; no leaks detected.",
    dueIn: -48,
    createdBy: PEOPLE.SUPERVISOR,
    owner: PEOPLE.SUPERVISOR,
  },
  {
    id: "ACT-2024",
    title: "B-train compressor restart monitoring",
    area: "B-train",
    equipment: "C-101",
    priority: "high",
    status: "open",
    source: "handover",
    category: "operational",
    description:
      "Continue close monitoring of B-train compressor following night-shift trip and restart at 02:31.",
    dueIn: 10,
    createdBy: PEOPLE.OPERATOR,
    owner: PEOPLE.OPERATOR,
  },
  {
    id: "ACT-2021",
    title: "Unit 3 PSV pop-test scheduling",
    area: "Unit 3",
    equipment: "PSV-301",
    priority: "medium",
    status: "open",
    source: "manual",
    category: "maintenance",
    description:
      "Coordinate with maintenance to schedule PSV-301 pop test during the next planned window.",
    dueIn: 72,
    createdBy: PEOPLE.MULTI_ROLE,
    owner: null,
  },
  {
    id: "ACT-2019",
    title: "Glycol contactor level transmitter drift",
    area: "Unit 3",
    equipment: "LT-307",
    priority: "high",
    status: "in_progress",
    source: "alarm",
    category: "process",
    description:
      "Level transmitter LT-307 reading inconsistent with sight glass; instrumentation investigating.",
    dueIn: 50,
    createdBy: PEOPLE.SUPERVISOR,
    owner: PEOPLE.SUPERVISOR,
  },
  {
    id: "ACT-2016",
    title: "Firewater pump weekly run test",
    area: "Utilities",
    equipment: "P-910",
    priority: "low",
    status: "open",
    source: "manual",
    category: "safety",
    description:
      "Perform weekly firewater pump P-910 run test and record discharge pressure.",
    dueIn: 120,
    createdBy: PEOPLE.MANAGEMENT,
    owner: null,
  },
  {
    id: "ACT-2013",
    title: "B-train flare KO drum high level",
    area: "B-train",
    equipment: "V-145",
    priority: "critical",
    status: "open",
    source: "alarm",
    category: "safety",
    description:
      "Flare knock-out drum V-145 high-level alarm; verify pump-out and inspect for liquid carryover.",
    dueIn: -8,
    createdBy: PEOPLE.OPERATOR,
    owner: PEOPLE.OPERATOR,
  },
  {
    id: "ACT-2010",
    title: "FT-330 transmitter loop check",
    area: "Unit 3",
    equipment: "FT-330",
    priority: "medium",
    status: "on_hold",
    source: "handover",
    category: "process",
    description:
      "Loop check pending instrument tech availability; awaiting calibration of FT-330.",
    dueIn: 54,
    createdBy: PEOPLE.MULTI_ROLE,
    owner: PEOPLE.MULTI_ROLE,
  },
  {
    id: "ACT-2007",
    title: "C-101 lube oil cooler fouling check",
    area: "Utilities",
    equipment: "E-118",
    priority: "medium",
    status: "open",
    source: "ai_suggested",
    category: "maintenance",
    description:
      "Lube oil cooler E-118 outlet temperature trending up; inspect for tube fouling.",
    dueIn: 92,
    createdBy: PEOPLE.SUPERVISOR,
    owner: null,
  },
  {
    id: "ACT-2004",
    title: "Nitrogen header pressure low investigation",
    area: "Utilities",
    equipment: "PT-220",
    priority: "high",
    status: "in_progress",
    source: "alarm",
    category: "operational",
    description:
      "N2 header pressure below setpoint; checking generation package and downstream demand.",
    dueIn: 26,
    createdBy: PEOPLE.MANAGEMENT,
    owner: PEOPLE.MANAGEMENT,
  },
  {
    id: "ACT-2001",
    title: "Walkdown — XV-118 actuator air leak",
    area: "B-train",
    equipment: "XV-118",
    priority: "low",
    status: "completed",
    source: "safety_observation",
    category: "maintenance",
    description:
      "Minor actuator air leak on XV-118 identified and tightened during walkdown.",
    dueIn: -24,
    createdBy: PEOPLE.OPERATOR,
    owner: PEOPLE.OPERATOR,
  },
];

/** Roughly when the record was raised: a shift before it fell due. */
const CREATED_OFFSET_HOURS = 12;

export const seedActions = (base: Date): ActionWire[] =>
  SEEDS.map((seed) => ({
    id: seed.id,
    title: seed.title,
    area: seed.area,
    equipment: seed.equipment,
    priority: seed.priority,
    status: seed.status,
    source: seed.source,
    category: seed.category,
    description: seed.description,
    due_at: hoursFromBase(seed.dueIn, base),
    created_at: hoursFromBase(seed.dueIn - CREATED_OFFSET_HOURS, base),
    created_by: actor(seed.createdBy),
    owner: seed.owner ? actor(seed.owner) : null,
  }));

/**
 * `state.suggestions`, app-source.txt 56–59 — the AI-extracted candidates
 * FR-PA-01 pairs with manual tagging, which FR-PA-02 has a Supervisor confirm
 * into the summary.
 *
 * `confidence` is 0–100 in the prototype and stays that way. FR-AI-05 requires
 * the assistant to *state* when confidence is low, so the number has to survive
 * to the UI rather than being pre-bucketed into a label here.
 */
export const seedSuggestions = (): SuggestionWire[] => [
  {
    id: "AI-118",
    title: "Inspect XV-118 relief valve for passing",
    reason:
      "Compressor trip at 02:14 correlated with high vibration; downstream relief valve may be passing.",
    source_reference: "Night-shift log · 10 Jun 02:14",
    confidence: 92,
    area: "B-train",
    equipment: "XV-118",
    priority: "critical",
    confirmed: null,
  },
  {
    id: "AI-204",
    title: "Schedule P-204 bearing replacement",
    reason: "Vibration trend exceeded 4.5 mm/s sustained over three shifts.",
    source_reference: "Vibration trend · Unit 3",
    confidence: 78,
    area: "B-train",
    equipment: "P-204",
    priority: "high",
    confirmed: null,
  },
  {
    id: "AI-330",
    title: "Recalibrate FT-330 flow transmitter",
    reason: "Drift of 2.1% detected against mass balance reconciliation.",
    source_reference: "Process log · Unit 3",
    confidence: 64,
    area: "Unit 3",
    equipment: "FT-330",
    priority: "medium",
    confirmed: null,
  },
];

/**
 * Comments on an action. The prototype keeps drafts and extra comments in
 * component state (`cmtDraft`, `extraComments`, line 86) with no seeded thread;
 * one seeded exchange gives the Phase 1 detail screen something to render before
 * anybody types.
 *
 * Who may post is gated by the `operator_comment_permission` workflow toggle
 * (FR-SUM-08, app-source.txt 2003), enforced on the mutation.
 */
export const seedActionComments = (base: Date): ActionCommentWire[] => [
  {
    id: "ACM-001",
    action_id: "ACT-2038",
    author: actor(PEOPLE.OPERATOR),
    body: "Alignment checked against the last two trends — bearing condition still within limits, continuing to monitor each round.",
    created_at: hoursFromBase(-6, base),
  },
  {
    id: "ACM-002",
    action_id: "ACT-2038",
    author: actor(PEOPLE.SUPERVISOR),
    body: "Noted. Keep it on the handover list until the vibration trend turns.",
    created_at: hoursFromBase(-4, base),
  },
  {
    id: "ACM-003",
    action_id: "ACT-2041",
    author: actor(PEOPLE.SUPERVISOR),
    body: "Isolation with panel is booked for the start of the next day shift.",
    created_at: hoursFromBase(-20, base),
  },
];
