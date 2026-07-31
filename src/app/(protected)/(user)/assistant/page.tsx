import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { AssistantChat } from "@/features/assistant/components/AssistantChat";

export const metadata: Metadata = { title: "Ask Assistant" };

/**
 * §7.4 — the bilingual assistant. The prototype's `assistant` screen
 * (`app-source.txt` 1322–1344).
 *
 * The subtitle is the prototype's own, and it is a promise this build keeps: the
 * answer comes back in the language asked, because `POST /assistant/query`
 * returns the language on the answer and `AssistantAnswerCard` renders `dir`
 * from it.
 *
 * **The answer itself is [BACKEND]** — an on-premises LLM doing RAG over the
 * curated layer. What runs here is the contract.
 */
export default function AssistantPage() {
  return (
    <>
      <PageHeader
        title="Ask Assistant"
        description="Query the logbook in English or Arabic — answers come back in the language you ask, with their sources cited."
      />
      <AssistantChat />
    </>
  );
}
