import { z } from "zod";
import {
  ApiError,
  jsonError,
  jsonOk,
  readJson,
  route,
  zodFieldErrors,
} from "@/lib/api";
import { createSessionToken, hashPassword, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  name: z.string().trim().min(1).max(80).optional(),
});

export const POST = route(async (req) => {
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) {
    return jsonError(422, "VALIDATION", "Invalid signup details.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(
      409,
      "EMAIL_TAKEN",
      "An account with that email already exists.",
    );
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name ?? null,
      password: await hashPassword(parsed.data.password),
    },
    select: { id: true, email: true, name: true },
  });

  await setSessionCookie(
    await createSessionToken({ userId: user.id, email: user.email }),
  );

  return jsonOk({ user }, { status: 201 });
});
