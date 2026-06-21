import type { Prisma } from "@prisma/client";

export interface SerializedRecord {
  id: string;
  data: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export function serializeRecord(r: {
  id: string;
  data: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): SerializedRecord {
  return {
    id: r.id,
    data: (r.data ?? {}) as Record<string, unknown>,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/** Type-aware comparison used for sorting JSONB record fields (nulls last). */
export function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}
