"use client";

import { useForm, useWatch } from "react-hook-form";
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
  deriveShiftConfig,
  shiftTimingsFormSchema,
  type ShiftTimingsFormValues,
} from "@/features/admin/schemas";
import { PLANT_TIME_ZONE_LABEL } from "@/lib/datetime";

/**
 * **FR-HOME-03** — "Define a shift as a 12-hour period (06:00–06:15 overlap);
 * shift boundaries configurable. The Administrator can change shift timings, and
 * report/summary generation aligns to them."
 *
 * Ported from `adminConfig()` (`app-source.txt` 2009–2019). Three deviations,
 * all named:
 *
 * 1. **Two editable fields, three derived.** See `deriveShiftConfig`.
 * 2. **The overlap is a number, not the prototype's free-text `"15 minutes"`.**
 *    The wire field is `overlap_minutes: z.number()`, and a string with the unit
 *    baked in cannot be validated or compared.
 * 3. **`type="time"`, not free text.** The prototype uses a plain input with no
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

  if (isLoading) return <Skeleton className="h-96 w-full max-w-2xl" />;

  if (isError || !config) {
    return (
      <p
        role="alert"
        className="max-w-2xl rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
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
        overlapMinutes: config.overlapMinutes,
      }}
      isSubmitting={updateConfig.isPending}
      onSubmit={(values) => updateConfig.mutate(deriveShiftConfig(values))}
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
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ShiftTimingsFormValues>({
    resolver: zodResolver(shiftTimingsFormSchema),
    defaultValues,
  });

  // `useWatch`, not `watch()` — the latter returns a function React Compiler
  // cannot memoize, which makes it skip the whole component.
  const dayStart = useWatch({ control, name: "dayStart" });

  // The same derivation the submit uses, so what is shown is what is sent.
  const derived = deriveShiftConfig({
    dayStart: dayStart || defaultValues.dayStart,
    overlapMinutes: defaultValues.overlapMinutes,
  });

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Shift timings</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm text-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          Shift boundaries determine when summaries auto-generate and when shift
          context switches on dashboards. Times are plant time (
          {PLANT_TIME_ZONE_LABEL}).
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

            {/*
              Read-only rather than absent. An Administrator needs to see what
              their start time implies before saving it — and these three are
              what the request will actually carry.
            */}
            <div className="rounded-md border border-dashed p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Derived from the start time — a shift is twelve hours
                (FR-HOME-03)
              </p>
              <dl className="grid grid-cols-3 gap-3 text-sm max-sm:grid-cols-1">
                <div>
                  <dt className="text-muted-foreground">Day shift end</dt>
                  <dd className="font-medium tabular-nums">
                    {derived.day_end}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Night shift start</dt>
                  <dd className="font-medium tabular-nums">
                    {derived.night_start}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Night shift end</dt>
                  <dd className="font-medium tabular-nums">
                    {derived.night_end}
                  </dd>
                </div>
              </dl>
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
