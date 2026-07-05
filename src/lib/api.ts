import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { ApiError } from "@/lib/auth";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function errorResponse(status: number, message: string, details?: unknown) {
  return NextResponse.json({ error: { message, details } }, { status });
}

/**
 * Wraps a route handler with consistent error handling:
 * - ApiError -> its status code
 * - ZodError -> 400 with field details
 * - anything else -> 500 (message hidden in production)
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof ApiError) {
        return errorResponse(err.status, err.message);
      }
      if (err instanceof ZodError) {
        return errorResponse(400, "Invalid input", err.flatten().fieldErrors);
      }
      console.error("[api] unhandled error:", err);
      const message =
        process.env.NODE_ENV === "production" ? "Internal server error" : String(err);
      return errorResponse(500, message);
    }
  };
}

/** Parse and validate a JSON body against a Zod schema. */
export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON");
  }
  return schema.parse(json);
}

/** Best-effort client IP for anonymous rate limiting. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
