import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { env } from "./env";
import { queryOne } from "./db";

const COOKIE_NAME = "edusys_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type UserRole = "student" | "admin";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.authSecret);
}

// ── passwords ────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 11);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ── sessions ─────────────────────────────────────────────────

/** Issues a signed cookie identifying the user. */
export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({ name: user.name, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/**
 * Reads the session cookie and returns the user, or null.
 *
 * The cookie is trusted only after signature verification; the user
 * row is then re-read so a deleted account cannot keep browsing.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey());
    const id = payload.sub;
    if (!id) return null;

    // The role is read from the database rather than the token, so a
    // promotion or demotion takes effect immediately instead of when
    // the cookie happens to expire.
    return await queryOne<SessionUser>(
      "SELECT id, name, email, role FROM users WHERE id = $1",
      [id],
    );
  } catch {
    // Expired or tampered-with token.
    return null;
  }
}

/** Use inside API routes that must have a logged-in user. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/** Use inside routes and pages that only placement-cell staff may see. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new ForbiddenError();
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Not signed in");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super("You do not have access to that");
    this.name = "ForbiddenError";
  }
}
