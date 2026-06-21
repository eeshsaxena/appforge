"use client";

import * as React from "react";
import { FieldType, NormalizedField } from "@/lib/config/schema";
import { Input, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface FieldInputProps {
  field: NormalizedField;
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur?: () => void;
  id: string;
  invalid?: boolean;
  disabled?: boolean;
}

const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));

function TextField(p: FieldInputProps) {
  const type =
    p.field.type === "email" ? "email" : p.field.type === "url" ? "url" : "text";
  return (
    <Input
      id={p.id}
      type={type}
      value={str(p.value)}
      placeholder={p.field.placeholder}
      disabled={p.disabled}
      aria-invalid={p.invalid}
      onChange={(e) => p.onChange(e.target.value)}
      onBlur={p.onBlur}
    />
  );
}

function TextareaField(p: FieldInputProps) {
  return (
    <Textarea
      id={p.id}
      value={str(p.value)}
      placeholder={p.field.placeholder}
      disabled={p.disabled}
      aria-invalid={p.invalid}
      onChange={(e) => p.onChange(e.target.value)}
      onBlur={p.onBlur}
    />
  );
}

function NumberField(p: FieldInputProps) {
  return (
    <Input
      id={p.id}
      type="number"
      value={str(p.value)}
      placeholder={p.field.placeholder}
      disabled={p.disabled}
      aria-invalid={p.invalid}
      min={p.field.min}
      max={p.field.max}
      onChange={(e) =>
        p.onChange(e.target.value === "" ? "" : Number(e.target.value))
      }
      onBlur={p.onBlur}
    />
  );
}

function DateField(p: FieldInputProps) {
  const type = p.field.type === "datetime" ? "datetime-local" : "date";
  return (
    <Input
      id={p.id}
      type={type}
      value={str(p.value)}
      disabled={p.disabled}
      aria-invalid={p.invalid}
      onChange={(e) => p.onChange(e.target.value)}
      onBlur={p.onBlur}
    />
  );
}

function BooleanField(p: FieldInputProps) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <input
        id={p.id}
        type="checkbox"
        className="h-4 w-4 rounded border-border text-[var(--brand)] focus:ring-[var(--brand)]"
        checked={Boolean(p.value)}
        disabled={p.disabled}
        onChange={(e) => p.onChange(e.target.checked)}
        onBlur={p.onBlur}
      />
      <span className="text-sm text-muted">{p.field.placeholder ?? "Yes"}</span>
    </label>
  );
}

function SelectField(p: FieldInputProps) {
  return (
    <Select
      id={p.id}
      value={str(p.value)}
      disabled={p.disabled}
      aria-invalid={p.invalid}
      onChange={(e) => p.onChange(e.target.value)}
      onBlur={p.onBlur}
    >
      <option value="">
        {p.field.required ? "Select…" : "— none —"}
      </option>
      {p.field.options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </Select>
  );
}

function MultiSelectField(p: FieldInputProps) {
  const selected = Array.isArray(p.value) ? (p.value as string[]) : [];
  const toggle = (opt: string) => {
    const next = selected.includes(opt)
      ? selected.filter((s) => s !== opt)
      : [...selected, opt];
    p.onChange(next);
  };
  if (p.field.options.length === 0) {
    return <p className="text-xs text-muted">No options configured.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {p.field.options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            type="button"
            key={opt}
            disabled={p.disabled}
            onClick={() => toggle(opt)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "border-[var(--brand)] bg-indigo-50 text-indigo-700"
                : "border-border bg-surface text-muted hover:bg-slate-50",
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/** fieldType -> input component. Extend the runtime by adding an entry here. */
export const FIELD_REGISTRY: Record<
  FieldType,
  React.ComponentType<FieldInputProps>
> = {
  text: TextField,
  textarea: TextareaField,
  number: NumberField,
  email: TextField,
  url: TextField,
  date: DateField,
  datetime: DateField,
  boolean: BooleanField,
  select: SelectField,
  multiselect: MultiSelectField,
};

export function FieldInput(props: FieldInputProps) {
  const Component = FIELD_REGISTRY[props.field.type] ?? TextField;
  return <Component {...props} />;
}
