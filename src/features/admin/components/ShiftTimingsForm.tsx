"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpdateShiftConfig } from "@/features/admin/api/mutations";
import { useShiftConfig } from "@/features/admin/api/queries";
import {
  shiftTimingsFormSchema,
  toShiftConfigWire,
  type ShiftTimingsFormValues,
} from "@/features/admin/schemas";
import { PLANT_TIME_ZONE_LABEL } from "@/lib/datetime";

/**
 * **FR-HOME-03** — "Define a shift as a 12-hour period (06:00–06:15 overlap);
 * shift boundaries configurable. The Administrator can change shift timings, and
 * report/summary generation aligns to them."
 *
 * Ported from `config()` (`app-source.txt` 1662–1674): the four boundaries are
 * independently editable inputs, matching the prototype's literal layout. A
 * prior revision derived three of the four fields instead — the owner chose
 * this layout, so the twelve-hour rule FR-HOME-03 still requires is enforced
 * by `shiftTimingsFormSchema`'s refinements at submit time, not by
 * construction. Two further deviations, both named:
 *
 * 1. **The overlap is a number, not the prototype's free-text `"15 minutes"`.**
 *    The wire field is `overlap_minutes: z.number()`, and a string with the unit
 *    baked in cannot be validated or compared.
 * 2. **`type="time"`, not free text.** The prototype uses a plain input with no
 *    mask and no validation; the schema wants `HH:MM` and a browser already
 *    knows how to ask for one.
 *
 * The prototype's info banner is kept verbatim — and it is only *true* as of
 * this phase. Before it, `GET /shifts/current` ignored the stored value
 * entirely, so a card promising that boundaries "determine when summaries
 * auto-generate" would have been a false claim on screen.
 */
export const ShiftTimingsForm = () => {
  const { data: config, isLoading, isError } = useShiftConfig();
  const updateConfig = useUpdateShiftConfig();

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  if (isError || !config) {
    return (
      <p
        role="alert"
        className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
      >
        The shift timings could not be loaded, so they cannot be shown or
        changed. Reload to try again.
      </p>
    );
  }

  return (
    <ShiftTimingsFields
      defaultValues={{
        dayStart: config.dayStart,
        dayEnd: config.dayEnd,
        nightStart: config.nightStart,
        nightEnd: config.nightEnd,
        overlapMinutes: config.overlapMinutes,
      }}
      isSubmitting={updateConfig.isPending}
      onSubmit={(values) => updateConfig.mutate(toShiftConfigWire(values))}
    />
  );
};

interface ShiftTimingsFieldsProps {
  defaultValues: ShiftTimingsFormValues;
  isSubmitting: boolean;
  onSubmit: (values: ShiftTimingsFormValues) => void;
}

/**
 * Split out so the form is only constructed once the server's values are in
 * hand. `useForm`'s `defaultValues` are read at mount, so a form mounted beside
 * a pending query keeps the placeholder values it started with.
 */
const ShiftTimingsFields = ({
  defaultValues,
  isSubmitting,
  onSubmit,
}: ShiftTimingsFieldsProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ShiftTimingsFormValues>({
    resolver: zodResolver(shiftTimingsFormSchema),
    defaultValues,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shift timings</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm text-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          Shift boundaries determine when summaries auto-generate and when shift
          context switches on dashboards. Times are plant time (
          {PLANT_TIME_ZONE_LABEL}). A shift is twelve hours (FR-HOME-03), so the
          two boundaries of a shift must be exactly twelve hours apart.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
              <Field>
                <FieldLabel htmlFor="day-start">Day shift start</FieldLabel>
                <Input
                  id="day-start"
                  type="time"
                  aria-invalid={Boolean(errors.dayStart)}
                  {...register("dayStart")}
                />
                <FieldError errors={[errors.dayStart]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="day-end">Day shift end</FieldLabel>
                <Input
                  id="day-end"
                  type="time"
                  aria-invalid={Boolean(errors.dayEnd)}
                  {...register("dayEnd")}
                />
                <FieldError errors={[errors.dayEnd]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="night-start">Night shift start</FieldLabel>
                <Input
                  id="night-start"
                  type="time"
                  aria-invalid={Boolean(errors.nightStart)}
                  {...register("nightStart")}
                />
                <FieldError errors={[errors.nightStart]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="night-end">Night shift end</FieldLabel>
                <Input
                  id="night-end"
                  type="time"
                  aria-invalid={Boolean(errors.nightEnd)}
                  {...register("nightEnd")}
                />
                <FieldError errors={[errors.nightEnd]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="overlap-minutes">
                  Handover overlap (minutes)
                </FieldLabel>
                <Input
                  id="overlap-minutes"
                  type="number"
                  min={0}
                  step={1}
                  aria-invalid={Boolean(errors.overlapMinutes)}
                  {...register("overlapMinutes", { valueAsNumber: true })}
                />
                <FieldDescription>
                  FR-HOME-03&apos;s worked example is 15 minutes.
                </FieldDescription>
                <FieldError errors={[errors.overlapMinutes]} />
              </Field>
            </div>

            <div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {isSubmitting ? "Saving…" : "Save shift timings"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};
