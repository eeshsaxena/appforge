"use client";

import { Controller, useForm } from "react-hook-form";
import { NormalizedEntity } from "@/lib/config/schema";
import { Badge, Button, FieldError, HelpText, Label } from "@/components/ui";
import { FieldInput } from "./fields";

interface DynamicFormProps {
  entity: NormalizedEntity;
  initialValues?: Record<string, unknown>;
  serverErrors?: Record<string, string[]>;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel?: () => void;
}

function buildDefaults(
  entity: NormalizedEntity,
  initial?: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of entity.fields) {
    if (initial && field.name in initial) {
      out[field.name] = initial[field.name];
    } else if (field.defaultValue !== undefined) {
      out[field.name] = field.defaultValue;
    } else if (field.type === "boolean") {
      out[field.name] = false;
    } else if (field.type === "multiselect") {
      out[field.name] = [];
    } else {
      out[field.name] = "";
    }
  }
  return out;
}

/**
 * Renders an editable form for ANY entity from its field config.
 * Validation is intentionally server-authoritative (the runtime Zod schema),
 * so the form surfaces server field errors rather than duplicating rules.
 */
export function DynamicForm({
  entity,
  initialValues,
  serverErrors,
  submitting,
  submitLabel = "Save",
  onSubmit,
  onCancel,
}: DynamicFormProps) {
  const { control, handleSubmit } = useForm({
    defaultValues: buildDefaults(entity, initialValues),
  });

  if (entity.fields.length === 0) {
    return (
      <p className="text-sm text-muted">
        This entity has no fields defined yet. Add fields in the builder.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {entity.fields.map((field) => (
        <div key={field.name}>
          <Label htmlFor={field.name} required={field.required}>
            {field.label}
          </Label>
          {field.unknownType && (
            <Badge tone="amber" className="mb-1.5">
              unsupported type “{field.unknownType}” — editing as text
            </Badge>
          )}
          <Controller
            name={field.name}
            control={control}
            render={({ field: ctrl }) => (
              <FieldInput
                field={field}
                id={field.name}
                value={ctrl.value}
                onChange={ctrl.onChange}
                onBlur={ctrl.onBlur}
                disabled={submitting}
                invalid={Boolean(serverErrors?.[field.name])}
              />
            )}
          />
          <HelpText>{field.helpText}</HelpText>
          <FieldError messages={serverErrors?.[field.name]} />
        </div>
      ))}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
