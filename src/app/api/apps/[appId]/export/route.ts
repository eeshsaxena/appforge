import { z } from "zod";
import {
  ApiError,
  jsonError,
  jsonOk,
  readJson,
  requireUser,
  route,
  zodFieldErrors,
} from "@/lib/api";
import { loadAppForUser } from "@/lib/apps";
import { buildExportFiles, exportToGithub } from "@/lib/github/export";
import { slugify } from "@/lib/utils";

type Ctx = { params: Promise<{ appId: string }> };

/** Download the raw app config as a JSON file. */
export const GET = route<Ctx>(async (_req, ctx) => {
  const user = await requireUser();
  const { appId } = await ctx.params;
  const { app } = await loadAppForUser(appId, user.id);

  const json = JSON.stringify(app.config, null, 2);
  return new Response(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${slugify(app.name) || "app"}.appforge.json"`,
    },
  });
});

const postSchema = z.object({
  token: z.string().trim().optional(),
  repoName: z
    .string()
    .trim()
    .min(1, "Repository name is required.")
    .max(100)
    .regex(/^[A-Za-z0-9._-]+$/, "Use letters, numbers, dashes, dots, underscores."),
  private: z.boolean().optional(),
});

/** Export the app to a brand-new GitHub repository. */
export const POST = route<Ctx>(async (req, ctx) => {
  const user = await requireUser();
  const { appId } = await ctx.params;
  const { app, config } = await loadAppForUser(appId, user.id);

  const parsed = postSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    return jsonError(422, "VALIDATION", "Invalid export request.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }

  const token = parsed.data.token || process.env.GITHUB_TOKEN;
  if (!token) {
    throw new ApiError(
      400,
      "NO_TOKEN",
      "Provide a GitHub personal access token to export.",
    );
  }

  const files = buildExportFiles(app.name, app.config, config);
  const { url } = await exportToGithub({
    token,
    repoName: parsed.data.repoName,
    isPrivate: Boolean(parsed.data.private),
    files,
  });

  return jsonOk({ url });
});
