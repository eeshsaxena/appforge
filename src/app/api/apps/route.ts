import { z } from "zod";
import {
  jsonError,
  jsonOk,
  readJson,
  requireUser,
  route,
  zodFieldErrors,
} from "@/lib/api";
import { normalizeConfig } from "@/lib/config/normalize";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

const createSchema = z.object({
  name: z.string().trim().min(1, "App name is required.").max(80),
  description: z.string().trim().max(280).optional(),
  // Raw, untrusted config. Stored as authored; normalized on read.
  config: z.unknown().optional(),
});

async function uniqueSlug(ownerId: string, base: string): Promise<string> {
  const root = slugify(base) || "app";
  let slug = root;
  let n = 1;
  // Slug is unique per owner (see schema @@unique).
  while (await prisma.app.findFirst({ where: { ownerId, slug } })) {
    slug = `${root}-${++n}`;
  }
  return slug;
}

export const GET = route(async () => {
  const user = await requireUser();
  const apps = await prisma.app.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  const counts = await prisma.record.groupBy({
    by: ["appId"],
    where: { ownerId: user.id },
    _count: { _all: true },
  });
  const countByApp = new Map(counts.map((c) => [c.appId, c._count._all]));

  const items = apps.map((app) => {
    const { config, issues } = normalizeConfig(app.config);
    return {
      id: app.id,
      name: app.name,
      slug: app.slug,
      description: app.description,
      updatedAt: app.updatedAt,
      entityCount: config.entities.length,
      recordCount: countByApp.get(app.id) ?? 0,
      issueCount: issues.length,
    };
  });

  return jsonOk({ apps: items });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const parsed = createSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    return jsonError(422, "VALIDATION", "Invalid app details.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }

  const { name, description } = parsed.data;

  // Default to a minimal but valid config when none is supplied.
  const rawConfig =
    parsed.data.config ?? {
      name,
      description,
      entities: [],
      views: [],
      workflows: [],
    };

  const app = await prisma.app.create({
    data: {
      name,
      description: description ?? null,
      slug: await uniqueSlug(user.id, name),
      config: rawConfig as Prisma.InputJsonValue,
      ownerId: user.id,
    },
  });

  return jsonOk({ app }, { status: 201 });
});
