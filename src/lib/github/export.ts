import { ApiError } from "@/lib/api";
import { NormalizedConfig } from "@/lib/config/schema";

const GH_API = "https://api.github.com";

interface ExportFile {
  path: string;
  content: string;
}

async function gh(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(`${GH_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

/** UTF-8 safe base64 for the GitHub contents API. */
function toBase64(input: string): string {
  return Buffer.from(input, "utf-8").toString("base64");
}

/** Build the files that represent the exported app. */
export function buildExportFiles(
  appName: string,
  rawConfig: unknown,
  normalized: NormalizedConfig,
): ExportFile[] {
  const configJson = JSON.stringify(rawConfig, null, 2);

  const entityDocs = normalized.entities
    .map((e) => {
      const fields = e.fields
        .map(
          (f) =>
            `| \`${f.name}\` | ${f.type}${f.unknownType ? ` (was \`${f.unknownType}\`)` : ""} | ${f.required ? "yes" : "no"} |`,
        )
        .join("\n");
      return `### ${e.labelPlural}\n\n| Field | Type | Required |\n| --- | --- | --- |\n${fields || "_no fields_"}`;
    })
    .join("\n\n");

  const readme = `# ${appName}

Exported from **AppForge** — a metadata-driven app runtime.

This repository contains the JSON configuration for the app. Import
\`appforge.json\` back into AppForge to recreate the application (UI, APIs,
storage, and workflows are all generated from this file).

## Schema

${entityDocs || "_no entities_"}

## Workflows

${
  normalized.workflows.length
    ? normalized.workflows
        .map((w) => `- **${w.name}** — on \`${w.trigger.type}\` of \`${w.trigger.entity}\``)
        .join("\n")
    : "_none_"
}
`;

  return [
    { path: "appforge.json", content: configJson },
    { path: "README.md", content: readme },
  ];
}

/**
 * Create a new GitHub repo for the authenticated token and commit the files.
 * Uses the contents API (one commit per file), which also initializes the
 * default branch on the first write — no manual git tree manipulation needed.
 */
export async function exportToGithub(opts: {
  token: string;
  repoName: string;
  isPrivate: boolean;
  files: ExportFile[];
}): Promise<{ url: string }> {
  const { token, repoName, isPrivate, files } = opts;

  // 1) Validate the token and get the owner login.
  const userRes = await gh(token, "/user");
  if (userRes.status === 401) {
    throw new ApiError(401, "GH_BAD_TOKEN", "Invalid GitHub token.");
  }
  if (!userRes.ok) {
    throw new ApiError(502, "GH_ERROR", "Could not reach GitHub. Try again.");
  }
  const user = (await userRes.json()) as { login: string };

  // 2) Create the repository.
  const createRes = await gh(token, "/user/repos", {
    method: "POST",
    body: JSON.stringify({
      name: repoName,
      private: isPrivate,
      description: "Exported from AppForge",
      auto_init: false,
    }),
  });
  if (createRes.status === 422) {
    throw new ApiError(
      422,
      "GH_REPO_EXISTS",
      `A repo named "${repoName}" already exists on your account.`,
    );
  }
  if (createRes.status === 403) {
    throw new ApiError(
      403,
      "GH_FORBIDDEN",
      "Token lacks permission to create repositories (needs the 'repo' scope).",
    );
  }
  if (!createRes.ok) {
    throw new ApiError(502, "GH_ERROR", "Failed to create the repository.");
  }
  const repo = (await createRes.json()) as { html_url: string };

  // 3) Commit each file via the contents API.
  for (const file of files) {
    const putRes = await gh(
      token,
      `/repos/${user.login}/${repoName}/contents/${file.path}`,
      {
        method: "PUT",
        body: JSON.stringify({
          message: `Add ${file.path}`,
          content: toBase64(file.content),
        }),
      },
    );
    if (!putRes.ok) {
      throw new ApiError(
        502,
        "GH_WRITE_FAILED",
        `Repo created, but writing ${file.path} failed.`,
      );
    }
  }

  return { url: repo.html_url };
}
