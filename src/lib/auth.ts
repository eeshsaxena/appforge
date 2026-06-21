import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

const COOKIE_NAME = "af_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
const encoder = new TextEncoder();

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 16) return encoder.encode(secret);
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set (>=16 chars) in production.");
  }
  // Dev-only fallback so the app runs before .env is configured.
  return encoder.encode("appforge-dev-insecure-secret-change-me-0001");
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: {
  userId: string;
  email: string;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

interface SessionPayload {
  userId: string;
  email: string;
}

async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.userId === "string" && typeof payload.email === "string") {
      return { userId: payload.userId, email: payload.email };
    }
    return null;
  } catch {
    return null; // expired / tampered / invalid
  }
}

/** Resolve the current authenticated user from the session cookie, or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await readSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true },
  });
  return user;
}
