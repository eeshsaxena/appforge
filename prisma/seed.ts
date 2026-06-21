import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { TEMPLATES } from "../src/lib/templates";
import { slugify } from "../src/lib/utils";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@appforge.dev";
const DEMO_PASSWORD = "demo1234";

async function main() {
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: { email: DEMO_EMAIL, name: "Demo User", password },
  });
  console.log(`Demo user: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);

  // Idempotent: clear this user's apps (records cascade) and reseed.
  await prisma.app.deleteMany({ where: { ownerId: user.id } });

  for (const template of TEMPLATES) {
    const name = (template.config.name as string) || template.name;
    const description = (template.config.description as string) || null;
    const app = await prisma.app.create({
      data: {
        name,
        description,
        slug: slugify(template.name),
        config: template.config as Prisma.InputJsonValue,
        ownerId: user.id,
      },
    });
    console.log(`  app: ${app.name}`);

    if (template.id === "crm") await seedCrm(app.id, user.id);
    if (template.id === "bug-tracker") await seedBugs(app.id, user.id);
  }

  console.log("Seed complete.");
}

function rows(
  appId: string,
  ownerId: string,
  entity: string,
  data: Record<string, unknown>[],
): Prisma.RecordCreateManyInput[] {
  return data.map((d) => ({
    appId,
    ownerId,
    entity,
    data: d as Prisma.InputJsonValue,
  }));
}

async function seedCrm(appId: string, ownerId: string) {
  await prisma.record.createMany({
    data: rows(appId, ownerId, "Contact", [
      { fullName: "Ada Lovelace", email: "ada@example.com", company: "Analytical Engines", status: "Active", tags: ["VIP"], notes: "Early adopter" },
      { fullName: "Alan Turing", email: "alan@example.com", company: "Bletchley", status: "Lead", tags: ["Trial"] },
      { fullName: "Grace Hopper", email: "grace@example.com", company: "Navy", status: "Active", tags: ["VIP", "Newsletter"] },
      { fullName: "Katherine Johnson", email: "katherine@example.com", company: "NASA", status: "Active", tags: ["Newsletter"] },
      { fullName: "Linus Torvalds", email: "linus@example.com", company: "Linux", status: "Churned", tags: [] },
      { fullName: "Margaret Hamilton", email: "margaret@example.com", company: "MIT", status: "Lead", tags: ["Trial"] },
    ]),
  });
  await prisma.record.createMany({
    data: rows(appId, ownerId, "Deal", [
      { title: "Enterprise rollout", amount: 24000, stage: "Negotiation", closeDate: "2026-07-20" },
      { title: "Team plan", amount: 4800, stage: "Won", closeDate: "2026-06-01" },
      { title: "Pilot program", amount: 1500, stage: "Prospect", closeDate: "2026-08-15" },
      { title: "Renewal", amount: 9600, stage: "Won", closeDate: "2026-05-10" },
    ]),
  });
}

async function seedBugs(appId: string, ownerId: string) {
  await prisma.record.createMany({
    data: rows(appId, ownerId, "Issue", [
      { title: "Login button misaligned on mobile", priority: "Low", status: "Open", assignee: "Sam", labels: ["bug"], resolved: false },
      { title: "CSV import drops last row", priority: "High", status: "In Progress", assignee: "Riya", labels: ["bug", "urgent"], resolved: false },
      { title: "Add dark mode", priority: "Medium", status: "Open", assignee: "Sam", labels: ["feature"], resolved: false },
      { title: "Crash on empty config", priority: "Critical", status: "Done", assignee: "Riya", labels: ["bug", "urgent"], resolved: true },
      { title: "Slow dashboard load", priority: "High", status: "Blocked", assignee: "Lee", labels: ["chore"], resolved: false },
      { title: "Typo in onboarding", priority: "Low", status: "Done", assignee: "Lee", labels: ["chore"], resolved: true },
      { title: "Export to GitHub fails on private", priority: "Medium", status: "Open", assignee: "Riya", labels: ["bug"], resolved: false },
      { title: "Improve form validation messages", priority: "Medium", status: "In Progress", assignee: "Sam", labels: ["feature"], resolved: false },
    ]),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
