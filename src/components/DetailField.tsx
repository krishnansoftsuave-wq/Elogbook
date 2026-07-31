import type { ReactNode } from "react";

/**
 * One labelled fact inside a `<dl>` — the label/value pair every detail screen
 * repeats.
 *
 * It renders `<dt>`/`<dd>` and therefore **must** be used inside a `<dl>`; that
 * pairing is what tells a screen reader these two pieces of text belong
 * together, which a `<div>` grid of headings would not.
 *
 * Deliberately **not** named `Field`: `components/ui/field.tsx` is the generated
 * shadcn *form* field, and two things called `Field` doing unrelated jobs is a
 * mis-import waiting to happen.
 *
 * Promoted from `features/actions/components/ActionDetail.tsx` when the summary
 * detail became the second caller.
 */

interface DetailFieldProps {
  label: string;
  children: ReactNode;
}

export const DetailField = ({ label, children }: DetailFieldProps) => (
  <div className="flex flex-col gap-1">
    <dt className="text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
      {label}
    </dt>
    <dd className="text-sm">{children}</dd>
  </div>
);
