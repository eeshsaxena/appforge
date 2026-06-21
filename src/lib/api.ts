import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser, SessionUser } from "./auth";

/** Standard success envelope: { data: ... } */
export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, init);
}

/** Standard error envelope: { error: { code, message, details? } } */
export function jsonError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): NextResponse {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

/** Throwable error that the route wrapper converts into a JSON response. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Require an authenticated user or throw a 401 (caught by the wrapper). */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new ApiError(401, "UNAUTHENTICATED", "You must be signed in.");
  }
  return user;
}

type RouteHandler<C> = (
  req: NextRequest,
  ctx: C,
) => Promise<Response> | Response;

/**
 * Wrap a route handler so it ALWAYS returns a structured JSON error instead of
 * an unhandled 500 HTML page. This is the reliability backbone of the API.
 */
export function route<C>(handler: RouteHandler<C>): RouteHandler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return jsonError(err.status, err.code, err.message, err.details);
      }
      // Prisma "record not found" etc. could be mapped here as needed.
      console.error("[api] unhandled error:", err);
      return jsonError(
        500,
        "INTERNAL",
        "Something went wrong while processing your request.",
      );
    }
  };
}

/** Flatten a ZodError into a { field: messages[] } map for 422 responses. */
export function zodFieldErrors(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = typeof issue.path[0] === "string" ? (issue.path[0] as string) : "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/** Safely parse a JSON request body, returning {} on empty/invalid bodies. */
export async function readJson(req: NextRequest): Promise<unknown> {
  try {
    const text = await req.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body is not valid JSON.");
  }
}
