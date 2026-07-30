import type { Metadata } from "next";

import { AccessDeniedPanel } from "@/features/auth/components/AccessDeniedPanel";

export const metadata: Metadata = { title: "Access denied" };

/**
 * §5's deny screen, deliberately ungated and deliberately not dev-only.
 *
 * It is `homeForSession`'s fallback for a session that can enter nowhere, so it
 * has to answer without a session — behind the guard it would be a redirect
 * loop rather than an explanation. It survives cutover unchanged: the condition
 * it describes is a backend rule (BE-US001-5), not a mock artefact.
 */
export default function AccessDeniedPage() {
  return <AccessDeniedPanel />;
}
