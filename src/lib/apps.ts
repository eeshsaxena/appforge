import { ApiError } from "./api";
import { normalizeConfig } from "./config/normalize";
import {
  findEntity,
  NormalizedConfig,
  NormalizedEntity,
} from "./config/schema";
import { prisma } from "./db";

/** Load an app the user owns, plus its normalized config. 404 if not theirs. */
export async function loadAppForUser(appId: string, userId: string) {
  const app = await prisma.app.findFirst({
    where: { id: appId, ownerId: userId },
  });
  if (!app) {
    throw new ApiError(404, "APP_NOT_FOUND", "App not found.");
  }
  const { config, issues } = normalizeConfig(app.config);
  return { app, config, issues };
}

/** Resolve an entity by name within a config, or throw 404. */
export function requireEntity(
  config: NormalizedConfig,
  entityName: string,
): NormalizedEntity {
  const entity = findEntity(config, entityName);
  if (!entity) {
    throw new ApiError(
      404,
      "ENTITY_NOT_FOUND",
      `Entity "${entityName}" does not exist in this app.`,
    );
  }
  return entity;
}
