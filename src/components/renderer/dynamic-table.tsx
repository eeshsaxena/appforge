"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown, Pencil, Trash2 } from "lucide-react";
import { NormalizedEntity } from "@/lib/config/schema";
import { RecordDTO } from "@/lib/types";
import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";
import { FieldDisplay } from "./field-display";

interface DynamicTableProps {
  entity: NormalizedEntity;
  columns: string[];
  records: RecordDTO[];
  sort: string;
  order: "asc" | "desc";
  loading?: boolean;
  onSort: (field: string) => void;
  onEdit: (record: RecordDTO) => void;
  onDelete: (record: RecordDTO) => void;
}

export function DynamicTable({
  entity,
  columns,
  records,
  sort,
  order,
  loading,
  onSort,
  onEdit,
  onDelete,
}: DynamicTableProps) {
  const fieldByName = new Map(entity.fields.map((f) => [f.name, f]));
  // Only render columns that map to a known field (config may drift).
  const cols = columns.filter((c) => fieldByName.has(c));

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
            {cols.map((col) => {
              const field = fieldByName.get(col)!;
              const active = sort === col;
              return (
                <th key={col} className="px-4 py-2.5 font-medium">
                  <button
                    type="button"
                    onClick={() => onSort(col)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    {field.label}
                    {active ? (
                      order === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ChevronsUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </button>
                </th>
              );
            })}
            <th className="px-4 py-2.5 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading &&
            records.length === 0 &&
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`sk-${i}`} className="border-b border-border last:border-0">
                {cols.map((c) => (
                  <td key={c} className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                ))}
                <td className="px-4 py-3">
                  <Skeleton className="ml-auto h-4 w-12" />
                </td>
              </tr>
            ))}

          {records.map((record) => (
            <tr
              key={record.id}
              className={cn(
                "border-b border-border last:border-0 hover:bg-slate-50/60",
                loading && "opacity-60",
              )}
            >
              {cols.map((col) => (
                <td key={col} className="px-4 py-3 align-top">
                  <FieldDisplay
                    field={fieldByName.get(col)!}
                    value={record.data[col]}
                  />
                </td>
              ))}
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(record)}
                    className="rounded-md p-1.5 text-muted hover:bg-slate-100 hover:text-foreground"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(record)}
                    className="rounded-md p-1.5 text-muted hover:bg-red-50 hover:text-red-600"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
