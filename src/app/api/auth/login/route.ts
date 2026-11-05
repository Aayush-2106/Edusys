import { z } from "zod";
import { queryOne } from "@/lib/db";
import { createSession, verifyPassword, type SessionUser } from "@/lib/auth";
import { handler, fail, ok } from "@/lib/api";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const POST = handler(async (request: Request) => {
  const input = schema.parse(await request.json());

  const row = await queryOne<SessionUser & { password_hash: string }>(
    "SELECT id, name, email, role, password_hash FROM users WHERE lower(email) = $1",
    [input.email],
  );

  // Same message either way — don't reveal which emails are registered.
  const invalid = fail("Incorrect email or password.", 401);
  if (!row) return invalid;

  const valid = await verifyPassword(input.password, row.password_hash);
  if (!valid) return invalid;

  const user = { id: row.id, name: row.name, email: row.email, role: row.role };
  await createSession(user);
  return ok({ user });
});
