import {
  jsonError,
  jsonOk,
  readJson,
  requireUser,
  route,
} from "@/lib/api";
import { loadAppForUser, requireEntity } from "@/lib/apps";
import { validateRecord } from "@/lib/config/validation";
import { prisma } from "@/lib/db";
import { compareValues, serializeRecord } from "@/lib/records";
import { runWorkflows } from "@/lib/workflows/engine";
import type { Prisma } from "@prisma/client";

type Ctx = { params: Promise<{ appId: string; entity: string }> };

const MAX_SCAN = 5000;

export const GET = route<Ctx>(async (req, ctx) => {
  const user = await requireUser();
  const { appId, entity } = await ctx.params;
  const { config } = await loadAppForUser(appId, user.id);
  const entityDef = requireEntity(config, entity);

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("pageSize")) || 20),
  );
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const sort = url.searchParams.get("sort") ?? "createdAt";
  const order = url.searchParams.get("order") === "asc" ? "asc" : "desc";

  // Scan the owner's records for this entity (indexed). For a demo's data
  // volumes, in-memory search/sort keeps JSONB querying simple and correct.
  const rows = await prisma.record.findMany({
    where: { appId, entity, ownerId: user.id },
    take: MAX_SCAN,
  });
  let items = rows.map(serializeRecord);

  if (q) {
    items = items.filter((r) =>
      Object.values(r.data).some((v) =>
        String(v ?? "").toLowerCase().includes(q),
      ),
    );
  }

  const dir = order === "asc" ? 1 : -1;
  items.sort((a, b) => {
    if (sort === "createdAt") return dir * compareValues(a.createdAt, b.createdAt);
    if (sort === "updatedAt") return dir * compareValues(a.updatedAt, b.updatedAt);
    return dir * compareValues(a.data[sort], b.data[sort]);
  });

  const total = items.length;
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);

  return jsonOk({
    items: paged,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    entity: { name: entityDef.name, label: entityDef.label },
  });
});

export const POST = route<Ctx>(async (req, ctx) => {
  const user = await requireUser();
  const { appId, entity } = await ctx.params;
  const { config } = await loadAppForUser(appId, user.id);
  const entityDef = requireEntity(config, entity);

  const result = validateRecord(entityDef, await readJson(req));
  if (!result.success) {
    return jsonError(422, "VALIDATION", "Record failed validation.", {
      fieldErrors: result.fieldErrors,
      formErrors: result.formErrors,
    });
  }

  const created = await prisma.record.create({
    data: {
      appId,
      entity: entityDef.name,
      ownerId: user.id,
      data: result.data as Prisma.InputJsonValue,
    },
  });

  // Fire create workflows (may mutate the record via setField).
  await runWorkflows(config, {
    appId,
    entity: entityDef,
    trigger: "record.created",
    record: result.data as Record<string, unknown>,
    recordId: created.id,
  });

  const fresh = await prisma.record.findUnique({ where: { id: created.id } });
  return jsonOk({ record: serializeRecord(fresh ?? created) }, { status: 201 });
});
