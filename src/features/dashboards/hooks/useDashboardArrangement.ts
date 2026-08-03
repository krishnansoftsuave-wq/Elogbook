"use client";

import { useCallback } from "react";

import { useSaveDashboardLayout } from "@/features/dashboards/api/mutations";
import { useMyDashboardLayout } from "@/features/dashboards/api/queries";
import { useRoleWidgets } from "@/features/dashboards/hooks/useRoleWidgets";
import { isWideByDefault } from "@/features/dashboards/widgetRegistry";
import {
  applyLayout,
  type DashboardLayoutEntry,
  type DashboardWidget,
} from "@/features/dashboards/schemas";

export interface ArrangedWidget {
  widget: DashboardWidget;
  hidden: boolean;
  wide: boolean;
}

export interface DashboardArrangement {
  /** Every widget the role is assigned, in this user's order — hidden included. */
  arranged: ArrangedWidget[];
  /** What the dashboard actually draws. */
  visible: ArrangedWidget[];
  isLoading: boolean;
  isError: boolean;
  /**
   * The widget library could not be read, so there is genuinely nothing to
   * draw. Distinct from `layoutError` — see the note on `persist`.
   */
  widgetsError: boolean;
  /**
   * The *personal layout* could not be read. The cards still render, in the
   * role's default order; what is unavailable is this user's arrangement of
   * them. Personalisation must stay switched off while this is true.
   */
  layoutError: boolean;
  isSaving: boolean;
  /** True once this user has saved anything — what enables "Reset". */
  isPersonalised: boolean;
  setHidden: (widgetId: string, hidden: boolean) => void;
  setWide: (widgetId: string, wide: boolean) => void;
  /** Move a widget to another index within `arranged`. */
  move: (widgetId: string, toIndex: number) => void;
  /** Drop the personal layout and return to the role's standard order. */
  reset: () => void;
}

/**
 * The role's dashboard (**FR-DASH-01**) as arranged by this user
 * (**FR-DASH-04**) — the join between the two, and the only place that knows
 * both.
 *
 * ## Every edit saves immediately
 *
 * The prototype gates personalisation behind an explicit *Save layout* button
 * (app-source.txt 1142). That is dropped, and the deviation is deliberate: a
 * separate save step invents a way to lose work — drag three cards, navigate
 * away, lose all three — for a screen where every change is trivially
 * reversible and individually meaningless. The mutation is optimistic, so the
 * card still moves at the speed of the gesture; "Done" closes the toolbars
 * rather than committing anything.
 *
 * **FR-DASH-05** ("personalisation may be simplified if it proves complex in
 * testing") is the requirement's own permission for exactly this kind of
 * simplification.
 *
 * ## Why the whole layout is written on every edit
 *
 * A layout is an *ordering*, and an ordering has no meaningful delta: hiding
 * the second of six cards changes nothing about the other five, but moving it
 * changes every index after it. One `PUT` of the arrangement is both simpler
 * and idempotent (**NFR-12**); a patch API would be several requests describing
 * one gesture.
 */
export const useDashboardArrangement = (): DashboardArrangement => {
  const {
    widgets,
    isLoading: widgetsLoading,
    isError: widgetsError,
  } = useRoleWidgets();
  const {
    data: layout,
    isLoading: layoutLoading,
    isError: layoutError,
  } = useMyDashboardLayout();
  const saveLayout = useSaveDashboardLayout();

  const arranged = applyLayout(widgets, layout ?? [], isWideByDefault);

  /**
   * Writes the whole arrangement — and refuses to write at all if the read
   * failed.
   *
   * **A failed GET is not "no personalisation".** `layout ?? []` above makes the
   * two states identical, so after two 500s the screen draws the role's default
   * order and every control still works. The first edit would then `PUT` that
   * default order over the user's real, unread layout — and because the write
   * succeeds, nothing would ever surface the loss. `Dashboard` hides the
   * personalise control on the same flag, so this guard is the second of two.
   *
   * **Entries for widgets the role cannot currently see are carried through.**
   * `applyLayout` drops a layout entry whose widget is unpublished or
   * unassigned, and the server does a full replace — so unpublishing a widget
   * and then nudging any card used to erase that widget's saved position and
   * hidden flag permanently. Re-publishing it appended it at the end with the
   * defaults, with no way back. Carrying the orphans is inert (`applyLayout`
   * ignores them) and makes the erasure recoverable.
   */
  const persist = useCallback(
    (next: ArrangedWidget[]) => {
      if (layoutError) return;

      const entries: DashboardLayoutEntry[] = next.map((item) => ({
        widgetId: item.widget.id,
        hidden: item.hidden,
        wide: item.wide,
      }));
      const known = new Set(entries.map((entry) => entry.widgetId));
      const orphans = (layout ?? []).filter(
        (entry) => !known.has(entry.widgetId)
      );

      saveLayout.mutate([...entries, ...orphans]);
    },
    [layout, layoutError, saveLayout]
  );

  const patch = useCallback(
    (widgetId: string, change: Partial<Omit<ArrangedWidget, "widget">>) => {
      persist(
        arranged.map((item) =>
          item.widget.id === widgetId ? { ...item, ...change } : item
        )
      );
    },
    [arranged, persist]
  );

  const setHidden = useCallback(
    (widgetId: string, hidden: boolean) => patch(widgetId, { hidden }),
    [patch]
  );

  const setWide = useCallback(
    (widgetId: string, wide: boolean) => patch(widgetId, { wide }),
    [patch]
  );

  const move = useCallback(
    (widgetId: string, toIndex: number) => {
      const from = arranged.findIndex((item) => item.widget.id === widgetId);
      if (from < 0) return;

      const bounded = Math.max(0, Math.min(arranged.length - 1, toIndex));
      if (bounded === from) return;

      const next = [...arranged];
      const [moved] = next.splice(from, 1);
      if (!moved) return;
      next.splice(bounded, 0, moved);

      persist(next);
    },
    [arranged, persist]
  );

  // An empty array, not `arranged` with every flag cleared: "no personalisation"
  // is a distinct state from "personalised back to the defaults", and only the
  // first keeps following the role's standard order as it changes.
  const reset = useCallback(() => saveLayout.mutate([]), [saveLayout]);

  return {
    arranged,
    visible: arranged.filter((item) => !item.hidden),
    isLoading: widgetsLoading || layoutLoading,
    isError: widgetsError || layoutError,
    widgetsError,
    layoutError,
    isSaving: saveLayout.isPending,
    isPersonalised: (layout ?? []).length > 0,
    setHidden,
    setWide,
    move,
    reset,
  };
};
