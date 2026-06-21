import {
  ApiError,
  jsonError,
  jsonOk,
  readJson,
  requireUser,
  route,
} from "@/lib/api";
import { loadAppForUser, requireEntity } from "@/lib/apps";
import { validateRecord } from "@/lib/config/validation";
import { prisma } from "@/lib/db";
import { serializeRecord } from "@/lib/records";
import { runWorkflows } from "@/lib/workflows/engine";
import type { Prisma } from "@prisma/client";

type Ctx = {
  params: Promise<{ appId: string; entity: string; recordId: string }>;
};

/** Load a record scoped to the owner/app/entity, or throw 404. */
async function loadRecord(
  appId: string,
  entity: string,
  recordId: string,
  ownerId: string,
) {
  const record = await prisma.record.findFirst({
    where: { id: recordId, appId, entity, ownerId },
  });
  if (!record) {
    throw new ApiError(404, "RECORD_NOT_FOUND", "Record not found.");
  }
  return record;
}

export const GET = route<Ctx>(async (_req, ctx) => {
  const user = await requireUser();
  const { appId, entity, recordId } = await ctx.params;
  const { config } = await loadAppForUser(appId, user.id);
  requireEntity(config, entity);

  const record = await loadRecord(appId, entity, recordId, user.id);
  return jsonOk({ record: serializeRecord(record) });
});

export const PUT = route<Ctx>(async (req, ctx) => {
  const user = await requireUser();
  const { appId, entity, recordId } = await ctx.params;
  const { config } = await loadAppForUser(appId, user.id);
  const entityDef = requireEntity(config, entity);

  await loadRecord(appId, entity, recordId, user.id); // ownership check

  const result = validateRecord(entityDef, await readJson(req));
  if (!result.success) {
    return jsonError(422, "VALIDATION", "Record failed validation.", {
      fieldErrors: result.fieldErrors,
      formErrors: result.formErrors,
    });
  }

  await prisma.record.update({
    where: { id: recordId },
    data: { data: result.data as Prisma.InputJsonValue },
  });

  await runWorkflows(config, {
    appId,
    entity: entityDef,
    trigger: "record.updated",
    record: result.data as Record<string, unknown>,
    recordId,
  });

  const fresh = await prisma.record.findUnique({ where: { id: recordId } });
  return jsonOk({ record: serializeRecord(fresh!) });
});

export const DELETE = route<Ctx>(async (_req, ctx) => {
  const user = await requireUser();
  const { appId, entity, recordId } = await ctx.params;
  const { config } = await loadAppForUser(appId, user.id);
  const entityDef = requireEntity(config, entity);

  const record = await loadRecord(appId, entity, recordId, user.id);
  await prisma.record.delete({ where: { id: recordId } });

  await runWorkflows(config, {
    appId,
    entity: entityDef,
    trigger: "record.deleted",
    record: (record.data ?? {}) as Record<string, unknown>,
    recordId: undefined,
  });

  return jsonOk({ ok: true });
});
