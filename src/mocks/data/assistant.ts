import type {
  AssistantLanguage,
  CitationWire,
} from "@/features/assistant/schemas";

/**
 * Canned assistant answers, standing in for the RAG pipeline.
 *
 * The prototype answers questions with `localParse()` / `sendChat` — a
 * client-side keyword match over its own mock arrays (app-source.txt 1345–1359).
 * That is **[BACKEND]** here and is not ported: the real answer comes from an
 * on-premises LLM over Spark/Iceberg (FR-DATA-01), and putting a fake parser in
 * the browser would teach the frontend a shape the backend will never send.
 *
 * What *is* modelled is the response contract, because the screen depends on it:
 *
 * - **FR-AI-01** — English and Arabic are both first-class, "each independently
 *   meeting the ≥95% accuracy target", and the answer comes back in the language
 *   asked. Language detection here is the prototype's own Arabic-range test
 *   (line 1347), which is enough to route a canned answer.
 * - **FR-AI-03** — every answer shows **source proof**: shift date, timestamp
 *   (GST) and record ID, "with click-through to the original entry". The
 *   prototype renders sources as flat strings (`'Night-shift log · 10 Jun
 *   02:14'`) with nothing to click. Citations are structured here so Phase 1 can
 *   actually link them — that is a gap the prototype does not close.
 * - **FR-AI-05** — "State clearly when confidence is low rather than risk an
 *   incorrect answer." Hence `confidence` and an explicit `low_confidence` flag
 *   rather than leaving the UI to pick a threshold.
 * - **FR-AI-06** — filtering by equipment, date range, author and area.
 *
 * **NFR-06 (OWASP LLM Top 10)** applies to whatever renders this: assistant
 * output is untrusted, so it is plain text and must never reach
 * `dangerouslySetInnerHTML`.
 *
 * PROVISIONAL field names.
 */

/** Below this, FR-AI-05 requires the answer to say so rather than assert. */
export const LOW_CONFIDENCE_THRESHOLD = 60;

/** The prototype's Arabic detection, unchanged (app-source.txt 1347). */
const ARABIC_RANGE = /[؀-ۿ]/;

export const detectLanguage = (question: string): AssistantLanguage =>
  ARABIC_RANGE.test(question) ? "ar" : "en";

interface CannedAnswer {
  /** Lowercase keywords; a question matching any one selects this answer. */
  match: readonly string[];
  en: string;
  ar: string;
  confidence: number;
  citations: readonly Omit<CitationWire, "occurred_at">[];
}

const CANNED: readonly CannedAnswer[] = [
  {
    match: ["b-train", "btrain", "compressor", "trip", "قطار", "ضاغط"],
    en: "During the night shift (18:00–06:00) B-train experienced a compressor trip at 02:14 due to high vibration. Operators restarted the unit at 02:31 and placed it under close monitoring. Relief valve XV-118 was flagged for follow-up verification.",
    ar: "خلال الوردية الليلية (18:00–06:00) تعرّض القطار B لتوقف الضاغط في الساعة 02:14 بسبب الاهتزاز العالي. أعاد المشغّلون تشغيل الوحدة في الساعة 02:31 ووضعوها تحت مراقبة لصيقة. تم وضع علامة على صمام الأمان XV-118 للتحقق لاحقًا.",
    confidence: 92,
    citations: [
      {
        record_id: "ELB-20250610-0042",
        label: "Night-shift log — compressor trip",
        shift_id: "20250609-N",
        target_type: "log_entry",
        target_id: "ELB-20250610-0042",
      },
      {
        record_id: "ACT-2041",
        label: "Relief valve XV-118 set-pressure verification",
        shift_id: "20250610-D",
        target_type: "action",
        target_id: "ACT-2041",
      },
    ],
  },
  {
    match: ["pending", "action", "overdue", "إجراء", "معلق", "متأخر"],
    en: "There are pending actions across B-train, Unit 3 and Utilities. The highest priority is relief-valve XV-118 set-pressure verification on B-train, which is now past its due date. Lube-oil pump P-204 vibration check is in progress.",
    ar: "توجد إجراءات معلّقة في القطار B والوحدة 3 والمرافق. الإجراء الأعلى أولوية هو التحقق من ضغط ضبط صمام الأمان XV-118 في القطار B، وقد تجاوز تاريخ استحقاقه. فحص اهتزاز مضخة زيت التزييت P-204 قيد التنفيذ.",
    confidence: 88,
    citations: [
      {
        record_id: "ACT-2041",
        label: "Relief valve XV-118 set-pressure verification",
        shift_id: "20250610-D",
        target_type: "action",
        target_id: "ACT-2041",
      },
      {
        record_id: "ACT-2038",
        label: "Lube oil pump P-204 vibration check",
        shift_id: "20250610-D",
        target_type: "action",
        target_id: "ACT-2038",
      },
    ],
  },
  {
    match: ["ft-330", "transmitter", "calibration", "معايرة"],
    en: "Flow transmitter FT-330 on Unit 3 shows a 2.1% drift against mass-balance reconciliation. A calibration is scheduled with instrumentation and a loop check is on hold pending technician availability.",
    ar: "يُظهر ناقل التدفق FT-330 في الوحدة 3 انحرافًا بنسبة 2.1% مقابل موازنة الكتلة. تمت جدولة المعايرة مع قسم الأجهزة، وفحص الحلقة معلّق بانتظار توفر الفني.",
    confidence: 71,
    citations: [
      {
        record_id: "ACT-2035",
        label: "FT-330 flow transmitter calibration",
        shift_id: "20250610-D",
        target_type: "action",
        target_id: "ACT-2035",
      },
    ],
  },
];

/**
 * FR-AI-05's answer when nothing matches. It states the limitation rather than
 * guessing, which is the whole point of the requirement — an assistant that
 * always answers confidently is the failure mode being designed out.
 */
const FALLBACK = {
  en: "I could not find enough in the connected logbook records to answer that confidently. Try naming an equipment tag, an area, or a date range — or check the pending actions list directly.",
  ar: "لم أجد ما يكفي في سجلات دفتر العمليات المتصلة للإجابة بثقة. جرّب تحديد وسم معدة أو منطقة أو نطاق زمني، أو راجع قائمة الإجراءات المعلّقة مباشرة.",
  confidence: 24,
} as const;

/**
 * Picks a canned answer by keyword. Deliberately dumb — this is a stand-in for
 * retrieval, not an attempt at it, and pretending otherwise would invite someone
 * to tune it instead of waiting for the real pipeline.
 */
export const answerFor = (
  question: string,
  language: AssistantLanguage
): {
  answer: string;
  confidence: number;
  citations: readonly Omit<CitationWire, "occurred_at">[];
} => {
  const needle = question.toLowerCase();
  const hit = CANNED.find((candidate) =>
    candidate.match.some((keyword) => needle.includes(keyword))
  );

  if (!hit) {
    return {
      answer: FALLBACK[language],
      confidence: FALLBACK.confidence,
      citations: [],
    };
  }

  return {
    answer: hit[language],
    confidence: hit.confidence,
    citations: hit.citations,
  };
};
