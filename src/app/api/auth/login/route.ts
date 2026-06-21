import { z } from "zod";
import {
  ApiError,
  jsonError,
  jsonOk,
  readJson,
  route,
  zodFieldErrors,
} from "@/lib/api";
import {
  createSessionToken,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const POST = route(async (req) => {
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) {
    return jsonError(422, "VALIDATION", "Invalid login details.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  // Same error whether the email or the password is wrong (no user enumeration).
  if (!user || !(await verifyPassword(parsed.data.password, user.password))) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Incorrect email or password.");
  }

  await setSessionCookie(
    await createSessionToken({ userId: user.id, email: user.email }),
  );

  return jsonOk({
    user: { id: user.id, email: user.email, name: user.name },
  });
});
