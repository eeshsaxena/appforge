import { z } from "zod";
import {
  jsonError,
  jsonOk,
  readJson,
  requireUser,
  route,
  zodFieldErrors,
} from "@/lib/api";
import { loadAppForUser } from "@/lib/apps";
import { normalizeConfig } from "@/lib/config/normalize";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

type Ctx = { params: Promise<{ appId: string }> };

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    description: z.string().trim().max(280).nullable().optional(),
    config: z.unknown().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Nothing to update.",
  });

export const GET = route<Ctx>(async (_req, ctx) => {
  const user = await requireUser();
  const { appId } = await ctx.params;
  const { app, config, issues } = await loadAppForUser(appId, user.id);

  return jsonOk({
    app: {
      id: app.id,
      name: app.name,
      slug: app.slug,
      description: app.description,
      config: app.config, // raw, for the editor
      updatedAt: app.updatedAt,
      createdAt: app.createdAt,
    },
    normalized: config, // normalized, for rendering
    issues,
  });
});

export const PUT = route<Ctx>(async (req, ctx) => {
  const user = await requireUser();
  const { appId } = await ctx.params;
  await loadAppForUser(appId, user.id); // ownership check (404 if not theirs)

  const parsed = updateSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    return jsonError(422, "VALIDATION", "Invalid update.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }

  const data: Prisma.AppUpdateInput = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.description !== undefined)
    data.description = parsed.data.description;
  if (parsed.data.config !== undefined)
    data.config = parsed.data.config as Prisma.InputJsonValue;

  const updated = await prisma.app.update({ where: { id: appId }, data });
  const { config, issues } = normalizeConfig(updated.config);

  return jsonOk({
    app: {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      config: updated.config,
      updatedAt: updated.updatedAt,
    },
    normalized: config,
    issues,
  });
});

export const DELETE = route<Ctx>(async (_req, ctx) => {
  const user = await requireUser();
  const { appId } = await ctx.params;
  await loadAppForUser(appId, user.id); // ownership check

  await prisma.app.delete({ where: { id: appId } });
  return jsonOk({ ok: true });
});
