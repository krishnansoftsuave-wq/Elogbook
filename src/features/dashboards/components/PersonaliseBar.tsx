"use client";

import { Check, RotateCcw, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * The personalise toggle — **FR-DASH-04**'s entry point, and the prototype's
 * own control (app-source.txt 1139–1143).
 *
 * ## Two prototype deviations
 *
 * **"Save layout" is now "Done".** The prototype gates every change behind an
 * explicit save (1142). Each edit here persists as it is made, so the button
 * closes the toolbars rather than committing anything — calling it "Save" would
 * promise that leaving without pressing it loses work, which is the opposite of
 * what happens.
 *
 * **"Drag cards to reorder · within admin limits" is gone.** Reordering is by
 * button (see `WidgetFrame`), and the second clause describes a constraint this
 * build enforces structurally instead: a user can only rearrange, hide or
 * resize what the Super User assigned them, because `applyLayout` starts from
 * the role's list. There is no path through this UI to add a widget, so there
 * is no limit to warn about.
 */

interface PersonaliseBarProps {
  personalising: boolean;
  /** Enables Reset — nothing to undo before a first change. */
  isPersonalised: boolean;
  isSaving: boolean;
  onToggle: () => void;
  onReset: () => void;
}

export const PersonaliseBar = ({
  personalising,
  isPersonalised,
  isSaving,
  onToggle,
  onReset,
}: PersonaliseBarProps) => (
  <div className="flex flex-wrap items-center justify-end gap-2">
    {personalising ? (
      <>
        <p className="me-auto text-xs text-muted-foreground">
          Hide, resize and reorder your cards. Changes save as you make them and
          apply only to you.
        </p>
        <Button
          type="button"
          variant="ghost"
          disabled={isSaving || !isPersonalised}
          onClick={onReset}
        >
          <RotateCcw aria-hidden />
          Reset to default
        </Button>
        <Button type="button" disabled={isSaving} onClick={onToggle}>
          <Check aria-hidden />
          Done
        </Button>
      </>
    ) : (
      <Button type="button" variant="outline" onClick={onToggle}>
        <SlidersHorizontal aria-hidden />
        Personalise
      </Button>
    )}
  </div>
);
