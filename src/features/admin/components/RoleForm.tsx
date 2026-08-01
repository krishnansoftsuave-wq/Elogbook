"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROUTES } from "@/constants/routes";
import {
  EMPTY_MODULE_PERMISSIONS,
  ROLE_DATA_SCOPE_LABEL,
  ROLE_MODULES,
  ROLE_MODULE_LABEL,
  ROLE_PERMISSION_ACTIONS,
  ROLE_PERMISSION_ACTION_LABEL,
  roleFormSchema,
  roleDataScopeSchema,
  type RoleFormValues,
} from "@/features/admin/schemas";
import { cn } from "@/lib/utils";

/** The sentinel `<Select>` value that reveals the inline "new AD group" field. */
const CREATE_AD_GROUP = "__create_new__";

interface RoleFormProps {
  defaultValues?: RoleFormValues;
  /** Every AD group already mapped to a role — base or custom. */
  existingAdGroups: readonly string[];
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: RoleFormValues) => void;
  /**
   * FR-AUTH-02 — a base role's AD group mapping is governed externally by the
   * OLNG AD admin, not this form. Name, permissions and data scope stay
   * editable; only the mapping itself locks.
   */
  adGroupLocked?: boolean;
}

/**
 * The New/Edit custom role form (`roleFormScreen`, `app-source.txt`
 * 1613–1630) — role name, a module permissions matrix, a data-scope toggle
 * and AD group mapping. Shared between `/admin/roles/add` and
 * `/admin/roles/[id]/edit`, the same way `EntryForm` serves both of
 * `entries`' panels.
 *
 * The module rows and the Area-Restricted option carry provenance notes on
 * `roleFormSchema` — read those before changing this component's shape.
 */
export const RoleForm = ({
  defaultValues,
  existingAdGroups,
  submitLabel,
  isSubmitting,
  onSubmit,
  adGroupLocked = false,
}: RoleFormProps) => {
  const startedWithNewGroup =
    Boolean(defaultValues) &&
    !existingAdGroups.includes(defaultValues!.adGroup);
  const [creatingAdGroup, setCreatingAdGroup] = useState(startedWithNewGroup);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: defaultValues ?? {
      name: "",
      permissions: EMPTY_MODULE_PERMISSIONS,
      dataScope: "full_plant",
      adGroup: "",
    },
  });

  // `useWatch` subscribes to one field each; the `watch()` function cannot be
  // memoized and makes React Compiler skip the whole component.
  const permissions = useWatch({ control, name: "permissions" });
  const dataScope = useWatch({ control, name: "dataScope" });
  const adGroup = useWatch({ control, name: "adGroup" });

  const adGroupSelectValue = creatingAdGroup ? CREATE_AD_GROUP : adGroup;

  const sortedAdGroups = useMemo(
    () => [...existingAdGroups].sort((a, b) => a.localeCompare(b)),
    [existingAdGroups]
  );

  return (
    <Card className="max-w-3xl">
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Role name</FieldLabel>
              <Input
                id="name"
                placeholder="e.g. Shutdown Coordinator"
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
              <FieldError errors={[errors.name]} />
            </Field>

            <FieldSet>
              <FieldLegend variant="label">Module permissions</FieldLegend>
              <div className="overflow-x-auto rounded-md border border-border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted">
                      <th className="p-2.5 text-left font-medium text-muted-foreground">
                        Module
                      </th>
                      {ROLE_PERMISSION_ACTIONS.map((action) => (
                        <th
                          key={action}
                          className="p-2.5 text-center font-medium text-muted-foreground"
                        >
                          {ROLE_PERMISSION_ACTION_LABEL[action]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ROLE_MODULES.map((module) => (
                      <tr key={module} className="border-b last:border-0">
                        <td className="p-2.5 text-left">
                          {ROLE_MODULE_LABEL[module]}
                        </td>
                        {ROLE_PERMISSION_ACTIONS.map((action) => (
                          <td key={action} className="p-2.5 text-center">
                            <Checkbox
                              className="mx-auto"
                              aria-label={`${ROLE_MODULE_LABEL[module]} — ${ROLE_PERMISSION_ACTION_LABEL[action]}`}
                              checked={permissions?.[module]?.[action] ?? false}
                              onCheckedChange={(checked) =>
                                setValue(
                                  `permissions.${module}.${action}`,
                                  checked === true,
                                  { shouldValidate: true }
                                )
                              }
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </FieldSet>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FieldSet>
                <FieldLegend variant="label">Data scope</FieldLegend>
                <div className="inline-flex w-fit overflow-hidden rounded-lg border">
                  {roleDataScopeSchema.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={dataScope === option}
                      onClick={() =>
                        setValue("dataScope", option, { shouldValidate: true })
                      }
                      className={cn(
                        "px-3 py-1.5 text-sm transition-colors",
                        dataScope === option
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {ROLE_DATA_SCOPE_LABEL[option]}
                    </button>
                  ))}
                </div>
                {dataScope === "area_restricted" ? (
                  <FieldDescription>
                    All operational roles currently have full-plant data
                    visibility (§9.2) — this build does not yet enforce an
                    area-restricted scope.
                  </FieldDescription>
                ) : null}
              </FieldSet>

              <Field>
                <FieldLabel htmlFor="ad-group">AD group mapping</FieldLabel>
                {adGroupLocked ? (
                  <>
                    <Input id="ad-group" value={adGroup} disabled readOnly />
                    <FieldDescription>
                      A base role&apos;s AD group mapping is governed by the
                      OLNG AD admin and cannot be changed here (FR-AUTH-02).
                    </FieldDescription>
                  </>
                ) : (
                  <>
                    <Select
                      value={adGroupSelectValue}
                      onValueChange={(value) => {
                        if (value === CREATE_AD_GROUP) {
                          setCreatingAdGroup(true);
                          setValue("adGroup", "", { shouldValidate: true });
                          return;
                        }
                        setCreatingAdGroup(false);
                        setValue("adGroup", value ?? "", {
                          shouldValidate: true,
                        });
                      }}
                    >
                      <SelectTrigger id="ad-group" className="w-full">
                        <SelectValue placeholder="Select existing AD group…" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedAdGroups.map((group) => (
                          <SelectItem key={group} value={group}>
                            {group}
                          </SelectItem>
                        ))}
                        <SelectItem value={CREATE_AD_GROUP}>
                          + Create new AD group mapping…
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {creatingAdGroup ? (
                      <Input
                        id="ad-group-new"
                        placeholder="e.g. ELOGBOOK_SAFETY_AUDITOR"
                        aria-label="New AD group name"
                        aria-invalid={Boolean(errors.adGroup)}
                        value={adGroup}
                        onChange={(event) =>
                          setValue("adGroup", event.target.value, {
                            shouldValidate: true,
                          })
                        }
                        className="mt-2"
                      />
                    ) : null}
                  </>
                )}
                <FieldError errors={[errors.adGroup]} />
              </Field>
            </div>

            <div className="flex gap-2 border-t pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {submitLabel}
              </Button>
              <Link
                href={ROUTES.ADMIN.ROLES}
                className={buttonVariants({ variant: "outline" })}
              >
                Cancel
              </Link>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};
