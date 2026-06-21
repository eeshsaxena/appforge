import {
  ApiError,
  jsonOk,
  readJson,
  requireUser,
  route,
} from "@/lib/api";
import { loadAppForUser, requireEntity } from "@/lib/apps";
import { validateRecord } from "@/lib/config/validation";
import { prisma } from "@/lib/db";
import { runWorkflows } from "@/lib/workflows/engine";
import type { Prisma } from "@prisma/client";

type Ctx = { params: Promise<{ appId: string; entity: string }> };

const MAX_ROWS = 1000;

/**
 * Bulk-import rows into an entity. Rows must already be mapped to field names
 * (the client maps CSV headers -> fields). Every row is validated against the
 * runtime schema; valid rows are inserted (and fire create workflows), invalid
 * rows are reported per-row so the user can fix and retry.
 */
export const POST = route<Ctx>(async (req, ctx) => {
  const user = await requireUser();
  const { appId, entity } = await ctx.params;
  const { config } = await loadAppForUser(appId, user.id);
  const entityDef = requireEntity(config, entity);

  const body = await readJson(req);
  const rows = Array.isArray((body as { rows?: unknown }).rows)
    ? (body as { rows: unknown[] }).rows
    : null;

  if (!rows) throw new ApiError(400, "INVALID", 'Expected a "rows" array.');
  if (rows.length === 0) throw new ApiError(400, "EMPTY", "No rows to import.");
  if (rows.length > MAX_ROWS) {
    throw new ApiError(
      413,
      "TOO_MANY",
      `Import is limited to ${MAX_ROWS} rows at a time.`,
    );
  }

  const errors: { row: number; messages: string[] }[] = [];
  let inserted = 0;

  for (let i = 0; i < rows.length; i++) {
    const result = validateRecord(entityDef, rows[i]);
    if (!result.success) {
      const messages = [
        ...Object.entries(result.fieldErrors).flatMap(([field, msgs]) =>
          msgs.map((m) => `${field}: ${m}`),
        ),
        ...result.formErrors,
      ];
      errors.push({ row: i + 1, messages: messages.length ? messages : ["Invalid row"] });
      continue;
    }

    const created = await prisma.record.create({
      data: {
        appId,
        entity: entityDef.name,
        ownerId: user.id,
        data: result.data as Prisma.InputJsonValue,
      },
    });
    await runWorkflows(config, {
      appId,
      entity: entityDef,
      trigger: "record.created",
      record: result.data as Record<string, unknown>,
      recordId: created.id,
    });
    inserted++;
  }

  return jsonOk({
    result: { inserted, failed: errors.length, total: rows.length, errors },
  });
});
