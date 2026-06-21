import { jsonOk, requireUser, route } from "@/lib/api";
import { loadAppForUser } from "@/lib/apps";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ appId: string }> };

/** Recent workflow runs for an app — powers the activity feed. */
export const GET = route<Ctx>(async (req, ctx) => {
  const user = await requireUser();
  const { appId } = await ctx.params;
  await loadAppForUser(appId, user.id); // ownership check

  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 25));

  const runs = await prisma.workflowRun.findMany({
    where: { appId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return jsonOk({ runs });
});
