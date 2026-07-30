"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { EntriesTable } from "@/features/entries/components/EntriesTable";
import type { EntryScope } from "@/features/entries/types";

interface Panel {
  id: EntryScope;
  label: string;
  caption: string;
  emptyMessage: string;
}

const PANELS: readonly Panel[] = [
  {
    id: "mine",
    label: "My entries",
    caption: "Your logbook entries, with the date performed and their status",
    emptyMessage: "You have not written any entries yet.",
  },
  {
    id: "pending",
    label: "Awaiting signature",
    caption: "Entries submitted to you, waiting to be signed",
    emptyMessage: "Nothing is waiting on your signature.",
  },
];

/**
 * Panels are toggled with `hidden` + `aria-hidden` rather than conditional
 * rendering, so each table keeps its own page, filters and scroll position
 * across a tab switch (AGENTS.md §9).
 */
export const LogbookPanels = () => {
  const [activePanel, setActivePanel] = useState<EntryScope>("mine");

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Logbook views" className="flex gap-2">
        {PANELS.map((panel) => (
          <Button
            key={panel.id}
            type="button"
            role="tab"
            id={`tab-${panel.id}`}
            aria-selected={activePanel === panel.id}
            aria-controls={`panel-${panel.id}`}
            variant={activePanel === panel.id ? "default" : "outline"}
            onClick={() => setActivePanel(panel.id)}
          >
            {panel.label}
          </Button>
        ))}
      </div>

      {PANELS.map((panel) => (
        <div
          key={panel.id}
          id={`panel-${panel.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${panel.id}`}
          hidden={activePanel !== panel.id}
          aria-hidden={activePanel !== panel.id}
        >
          <EntriesTable
            scope={panel.id}
            caption={panel.caption}
            emptyMessage={panel.emptyMessage}
          />
        </div>
      ))}
    </div>
  );
};
