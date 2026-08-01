"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ROUTE_PERMISSIONS, ROUTES } from "@/constants/routes";
import { useSession } from "@/features/auth/hooks/useSession";
import { hasPermission } from "@/lib/auth/permissions";

/**
 * The top bar's search field — the prototype's `topBar` search (`app-source.txt`
 * 196).
 *
 * ## What it searches, and why that is the assistant
 *
 * In the prototype this is a `<span>`, not an input: no handler, no state, no
 * results. There is also **no keyword-search requirement in the BRD** and no
 * search endpoint in the Phase 0a contract, so a faithful port would be an inert
 * box that looks like an input — which fails WCAG and, worse, silently swallows
 * whatever a demo audience types into it.
 *
 * What the BRD does ask for is **BO-02**: "Make operational history instantly
 * searchable in plain English and Arabic, with traceable sources." The thing
 * that delivers that is the assistant (FR-AI-01…08) — bilingual, cited, already
 * built. So this field is the assistant's entry point from anywhere in the app:
 * submitting navigates to `/assistant?q=…` and the question is asked on arrival.
 * Nothing new is invented at the API layer.
 *
 * Per-list keyword filtering already exists and is unaffected — every list
 * screen owns a `type="search"` input in its own filter bar.
 *
 * ## Why it is permission-gated
 *
 * `assistant:query` is held by Operator, Supervisor and Management but **not**
 * Super User (`ROUTE_PERMISSIONS.ASSISTANT`). Rendering the field for a session
 * that cannot reach `/assistant` would offer a control whose only outcome is a
 * redirect, so it is hidden for exactly the sessions the route guard would turn
 * away. The guard remains the authority — this is presentation, not access
 * control (FR-ADM-03).
 */
export const HeaderSearch = () => {
  const router = useRouter();
  const { session } = useSession();
  const [question, setQuestion] = useState("");
  const searchId = useId();

  if (!session) return null;
  if (
    !hasPermission(session.permissions, ROUTE_PERMISSIONS.ASSISTANT.permissions)
  ) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = question.trim();
    if (!trimmed) return;

    router.push(`${ROUTES.ASSISTANT}?q=${encodeURIComponent(trimmed)}`);
    // Cleared on the way out: the question now lives on the assistant screen,
    // and leaving it here would show the same text in two places.
    setQuestion("");
  };

  return (
    <form
      // The landmark the prototype's div cannot be. A search landmark is how a
      // screen-reader user jumps straight here from anywhere in the shell.
      role="search"
      onSubmit={handleSubmit}
      className="relative max-w-[26.25rem] min-w-0 flex-1"
    >
      {/*
        Deliberately not the placeholder's wording. This field is global, so its
        accessible name shares a page with every list screen's own search — and
        "…actions, equipment" collided with both the assistant's "Equipment"
        filter and the actions list's "Search actions" under the substring
        matching that `getByLabel` and screen-reader search both use. The five
        existing filter labels are each a distinct noun ("Search entries",
        "Search users", …); this is the sixth.
      */}
      <label htmlFor={searchId} className="sr-only">
        Search the logbook
      </label>

      {/* `start-3`, not `left-3`: this mirrors to the right edge under
          `dir="rtl"` (NFR-07). The magnifier is not one-directional, so it is
          positioned rather than flipped. */}
      <Search
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-on-brand/70"
        aria-hidden
      />

      {/*
        The primitive, restyled for the teal band rather than re-authored. Its
        defaults (`bg-background`, `border-input`, the `--ring` focus colour) are
        all tuned for a page surface and disappear on brand teal, so each is
        overridden with an `--on-brand` alpha — the same approach `Header`'s
        `ON_BRAND_CONTROL` already takes for the icon buttons.
      */}
      <Input
        id={searchId}
        type="search"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Search logs, actions, equipment…"
        className="border-on-brand/25 bg-on-brand/10 ps-9 text-on-brand placeholder:text-on-brand/60 focus-visible:border-on-brand/40 focus-visible:ring-on-brand/70"
      />
    </form>
  );
};
