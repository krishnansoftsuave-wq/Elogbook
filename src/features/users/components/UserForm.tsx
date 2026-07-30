"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
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
import { ROLE_LABEL, ROLE_VALUES, ROLES } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { userFormSchema } from "@/features/users/schemas";
import type { UserFormValues } from "@/features/users/types";
import { userStatusSchema } from "@/types/user";

const STATUS_LABEL: Record<UserFormValues["status"], string> = {
  active: "Active",
  invited: "Invited",
  suspended: "Suspended",
};

const EMPTY_USER: UserFormValues = {
  name: "",
  email: "",
  role: ROLES.OPERATOR,
  status: "invited",
};

interface UserFormProps {
  defaultValues?: UserFormValues;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: UserFormValues) => void;
}

export const UserForm = ({
  defaultValues,
  submitLabel,
  isSubmitting,
  onSubmit,
}: UserFormProps) => {
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: defaultValues ?? EMPTY_USER,
  });

  // `useWatch` subscribes to a single field; the `watch()` function cannot be
  // memoized and makes React Compiler skip the whole component.
  const role = useWatch({ control, name: "role" });
  const status = useWatch({ control, name: "status" });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="max-w-xl">
        <Field>
          <FieldLabel htmlFor="name">Full name</FieldLabel>
          <Input
            id="name"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
          <FieldError errors={[errors.email]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="role">Role</FieldLabel>
          <Select
            value={role}
            onValueChange={(value) => {
              const parsed = userFormSchema.shape.role.safeParse(value);
              if (parsed.success) setValue("role", parsed.data);
            }}
          >
            <SelectTrigger id="role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_VALUES.map((role) => (
                <SelectItem key={role} value={role}>
                  {ROLE_LABEL[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError errors={[errors.role]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="status">Status</FieldLabel>
          <Select
            value={status}
            onValueChange={(value) => {
              const parsed = userStatusSchema.safeParse(value);
              if (parsed.success) setValue("status", parsed.data);
            }}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {userStatusSchema.options.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABEL[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            href={ROUTES.ADMIN.USERS}
            className={buttonVariants({ variant: "outline" })}
          >
            Cancel
          </Link>
        </div>
      </FieldGroup>
    </form>
  );
};
