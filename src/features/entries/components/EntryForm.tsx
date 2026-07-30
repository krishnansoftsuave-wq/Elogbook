"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/constants/routes";
import { entryFormSchema } from "@/features/entries/schemas";
import type { EntryFormValues } from "@/features/entries/types";

const STATUS_LABEL: Record<EntryFormValues["status"], string> = {
  draft: "Save as draft",
  submitted: "Submit for signature",
};

/** `<input type="date">` wants a yyyy-mm-dd string in local time. */
const today = (): string => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
};

interface EntryFormProps {
  defaultValues?: EntryFormValues;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: EntryFormValues) => void;
}

export const EntryForm = ({
  defaultValues,
  submitLabel,
  isSubmitting,
  onSubmit,
}: EntryFormProps) => {
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: defaultValues ?? {
      title: "",
      body: "",
      performedAt: today(),
      status: "draft",
    },
  });

  // `useWatch` subscribes to a single field; the `watch()` function cannot be
  // memoized and makes React Compiler skip the whole component.
  const status = useWatch({ control, name: "status" });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="max-w-2xl">
        <Field>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input
            id="title"
            aria-invalid={Boolean(errors.title)}
            {...register("title")}
          />
          <FieldError errors={[errors.title]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="performedAt">Date performed</FieldLabel>
          <Input
            id="performedAt"
            type="date"
            max={today()}
            aria-invalid={Boolean(errors.performedAt)}
            {...register("performedAt")}
          />
          <FieldError errors={[errors.performedAt]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="body">What happened</FieldLabel>
          <Textarea
            id="body"
            rows={8}
            aria-invalid={Boolean(errors.body)}
            {...register("body")}
          />
          <FieldDescription>
            Describe the activity, the outcome and anything a supervisor needs
            to see before signing.
          </FieldDescription>
          <FieldError errors={[errors.body]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="status">On save</FieldLabel>
          <Select
            value={status}
            onValueChange={(value) => {
              const parsed = entryFormSchema.shape.status.safeParse(value);
              if (parsed.success) setValue("status", parsed.data);
            }}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {entryFormSchema.shape.status.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {STATUS_LABEL[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            A submitted entry can no longer be edited once it is signed.
          </FieldDescription>
          <FieldError errors={[errors.status]} />
        </Field>

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {submitLabel}
          </Button>
          {/* Cancel navigates away, so it is a link styled as a button. Base
              UI's `Button` assumes a native `<button>` and, told otherwise,
              stamps `role="button"` over the anchor's implicit `link` role. */}
          <Link
            href={ROUTES.LOGBOOK}
            className={buttonVariants({ variant: "outline" })}
          >
            Cancel
          </Link>
        </div>
      </FieldGroup>
    </form>
  );
};
