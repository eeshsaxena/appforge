"use client";

import { NormalizedField } from "@/lib/config/schema";
import { Badge } from "@/components/ui";

function formatDate(value: unknown, withTime: boolean): string {
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return withTime ? d.toLocaleString() : d.toLocaleDateString();
}

/** Read-only presentation of a field value, formatted by its type. */
export function FieldDisplay({
  field,
  value,
}: {
  field: NormalizedField;
  value: unknown;
}) {
  if (value === undefined || value === null || value === "") {
    return <span className="text-slate-300">—</span>;
  }

  switch (field.type) {
    case "boolean":
      return value ? (
        <Badge tone="green">Yes</Badge>
      ) : (
        <Badge tone="neutral">No</Badge>
      );
    case "select":
      return <Badge tone="brand">{String(value)}</Badge>;
    case "multiselect": {
      const items = Array.isArray(value) ? value : [value];
      return (
        <div className="flex flex-wrap gap-1">
          {items.map((v, i) => (
            <Badge key={i} tone="brand">
              {String(v)}
            </Badge>
          ))}
        </div>
      );
    }
    case "date":
      return <span>{formatDate(value, false)}</span>;
    case "datetime":
      return <span>{formatDate(value, true)}</span>;
    case "email":
      return (
        <a
          className="text-[var(--brand)] hover:underline"
          href={`mailto:${value}`}
        >
          {String(value)}
        </a>
      );
    case "url":
      return (
        <a
          className="text-[var(--brand)] hover:underline"
          href={String(value)}
          target="_blank"
          rel="noreferrer"
        >
          {String(value)}
        </a>
      );
    case "number":
      return <span className="tabular-nums">{String(value)}</span>;
    default:
      return (
        <span className="line-clamp-2 whitespace-pre-wrap break-words">
          {String(value)}
        </span>
      );
  }
}
