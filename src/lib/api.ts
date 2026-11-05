import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError } from "./auth";
import { GeminiError } from "./gemini";

/** Consistent error envelope so the client can always read `.error`. */
export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Wraps a route handler so thrown errors become sensible responses
 * instead of an opaque 500.
 */
export function handler<Args extends unknown[]>(
  fn: (...args: Args) => Promise<NextResponse>,
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return fail("You need to sign in to do that.", 401);
      }

      if (error instanceof ZodError) {
        const first = error.issues[0];
        return fail(first?.message ?? "Invalid request.", 422);
      }

      if (error instanceof GeminiError) {
        console.error("[gemini]", error.message);
        return fail(
          "The AI interviewer is temporarily unavailable. Please try again in a moment.",
          503,
        );
      }

      console.error("[api]", error);
      return fail("Something went wrong on our end.", 500);
    }
  };
}
