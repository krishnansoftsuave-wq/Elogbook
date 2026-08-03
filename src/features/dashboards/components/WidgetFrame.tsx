"use client";

import { Eye, EyeOff, GripVertical, Maximize2, Minimize2 } from "lucide-react";
import { useId, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * One dashboard card, plus the controls **FR-DASH-04** gives its owner: *"hide
 * widgets, resize/expand widgets, save a preferred layout"*.
 *
 * ## Native drag, not a drag library
 *
 * The prototype reorders by HTML5 drag (`draggable` + `onDrop`,
 * app-source.txt 1155–1158) and this does the same, for a structural reason
 * rather than a preference: `eslint.config.mjs:56` bans the `style` JSX
 * attribute, and every drag library positions the dragged element through
 * `style={{transform: …}}`. A drag offset is a continuous pixel value, so it
 * cannot be a Tailwind class, and the only ways to keep a library were to mutate
 * `node.style` behind the linter's back or disable the rule.
 *
 * The native API has no such problem, because the browser paints the drag image
 * itself — nothing here sets a transform at all. `@dnd-kit/core`, `/sortable`
 * and `/utilities` were declared dependencies with **zero imports** for exactly
 * this reason; they have now been uninstalled rather than left carrying audit
 * surface for code that does not exist.
 *
 * ## The grip is the keyboard control, not a decoration
 *
 * There were separate ⌃ / ⌄ move buttons here. The prototype has no such
 * buttons — its card header carries hide, expand and a grip, and nothing else
 * (app-source.txt 1155–1158) — so they were removed at the owner's request.
 *
 * They could not simply be deleted. **HTML5 drag is mouse-only**: there is no
 * key sequence that produces a `dragstart`, so with the buttons gone a keyboard
 * user would lose FR-DASH-04's reordering outright (WCAG 2.1.1), and so would
 * anyone on the gloved-hand plant-floor tablets **NFR-08** targets.
 *
 * The grip therefore *is* the control. It is a real `<button>`, focusable, and
 * ↑/↓ move the card — one icon, in the prototype's position, operable by both
 * input methods. A visually-hidden hint announces the gesture on focus, because
 * a control whose only affordance is undiscoverable is not much better than no
 * control.
 */

interface WidgetFrameProps {
  label: string;
  hidden: boolean;
  wide: boolean;
  /** Toolbars only render in personalise mode. */
  personalising: boolean;
  /** At the top already — ArrowUp on the grip is a no-op. */
  isFirst: boolean;
  isLast: boolean;
  isSaving: boolean;
  onToggleHidden: () => void;
  onToggleWide: () => void;
  /** ArrowUp on the grip. There is no longer a button of its own. */
  onMoveUp: () => void;
  onMoveDown: () => void;
  /** This card is the one currently being dragged. */
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  /** The dragged card was dropped on this one — reorder to this position. */
  onDropOn: () => void;
  children: ReactNode;
}

export const WidgetFrame = ({
  label,
  hidden,
  wide,
  personalising,
  isFirst,
  isLast,
  isSaving,
  onToggleHidden,
  onToggleWide,
  onMoveUp,
  onMoveDown,
  isDragging,
  onDragStart,
  onDragEnd,
  onDropOn,
  children,
}: WidgetFrameProps) => {
  /** Ties the grip to its keyboard hint, once per card. */
  const hintId = useId();

  return (
    <div
      /*
      Native HTML5 drag, and only while personalising — a draggable card in
      normal use would start a drag every time somebody tried to select text in
      it. `preventDefault` on dragover is what marks this a valid drop target;
      without it the browser refuses the drop and nothing happens, which is the
      single most common way this API appears broken.
    */
      draggable={personalising}
      /*
      `setData` is not optional. Gecko refuses to open a drag session when the
      drag data store is empty at the end of `dragstart`, so in Firefox no
      `dragover`, `drop` or `dragend` ever followed — reordering was silently
      dead there, and worse, the card stuck at `opacity-40` because the only two
      handlers that clear `dragId` are `onDragEnd` and `onDropOn`, neither of
      which fired. Chromium tolerates the omission and `playwright.config.ts`
      declares only a chromium project, so nothing here would have caught it.

      `text/plain` with the widget's label: the payload is unused (the dragged id
      lives in React state) but it has to be non-empty, and a label is at least
      meaningful if the card is dropped outside the app.
    */
      onDragStart={
        personalising
          ? (event) => {
              event.dataTransfer.setData("text/plain", label);
              event.dataTransfer.effectAllowed = "move";
              onDragStart();
            }
          : undefined
      }
      onDragEnd={personalising ? onDragEnd : undefined}
      onDragOver={personalising ? (event) => event.preventDefault() : undefined}
      onDrop={
        personalising
          ? (event) => {
              event.preventDefault();
              onDropOn();
            }
          : undefined
      }
      className={cn(
        "flex min-w-0 flex-col gap-2",
        // The prototype's `gridColumn: wide ? '1 / -1' : 'auto'` (1159). Only
        // above `xl`, where a second column exists at all.
        wide && "xl:col-span-2",
        personalising && "rounded-lg outline-2 outline-border outline-dashed",
        // Hidden cards stay on screen while personalising — dimmed — so turning
        // one back on does not mean remembering what is missing.
        personalising && hidden && "opacity-50",
        // The card being carried recedes, so the gap it will leave is visible.
        isDragging && "opacity-40"
      )}
    >
      {personalising ? (
        /*
        Controls to the **right**, grip last — the prototype's card header is a
        `space-between` row with hide, expand and the grip against its right edge
        (1155–1158). They used to sit grip-first on the left with the move
        buttons trailing, which is the opposite arrangement.
      */
        <div className="flex flex-wrap items-center gap-1 px-1 pt-1">
          <span className="me-auto truncate ps-1 text-xs font-semibold text-muted-foreground">
            {label}
          </span>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isSaving}
            onClick={onToggleHidden}
            aria-label={hidden ? `Show ${label}` : `Hide ${label}`}
          >
            {hidden ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isSaving}
            onClick={onToggleWide}
            aria-label={wide ? `Collapse ${label}` : `Expand ${label}`}
          >
            {wide ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
          </Button>

          {/*
          **The grip is the reordering control, not an ornament.** It was an
          `aria-hidden` icon beside two move buttons; the buttons are gone (the
          prototype has none) and deleting them outright would have left
          reordering mouse-only, since HTML5 drag has no keyboard equivalent.

          So: a real button, `cursor-grab` for the pointer affordance, and ↑/↓
          for everyone else. `onKeyDown` rather than `onClick` — a click on a
          grip has no meaning, and giving it one would make Enter and Space do
          something arbitrary.
        */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="cursor-grab"
            disabled={isSaving}
            aria-label={`Reorder ${label}`}
            aria-describedby={hintId}
            onKeyDown={(event) => {
              if (event.key === "ArrowUp" && !isFirst) {
                // Or the page scrolls under the card the user is moving.
                event.preventDefault();
                onMoveUp();
              }
              if (event.key === "ArrowDown" && !isLast) {
                event.preventDefault();
                onMoveDown();
              }
            }}
          >
            <GripVertical aria-hidden />
          </Button>
          <span id={hintId} className="sr-only">
            Drag to reorder, or press the up and down arrow keys.
          </span>
        </div>
      ) : null}

      {/*
      A hidden widget still mounts while personalising, so its preview is what
      the eye button turns back on. Outside personalise mode the caller filters
      it out entirely rather than rendering it invisibly — a hidden card should
      cost no requests.
    */}
      <div
        className={cn(
          "min-w-0",
          personalising && hidden && "pointer-events-none"
        )}
      >
        {children}
      </div>
    </div>
  );
};
