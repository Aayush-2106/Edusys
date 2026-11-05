import { z } from "zod";
import { queryOne } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { handler, fail, ok } from "@/lib/api";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your full name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  branch: z.string().trim().optional(),
  college: z.string().trim().optional(),
});

export const POST = handler(async (request: Request) => {
  const input = schema.parse(await request.json());

  const existing = await queryOne<{ id: string }>(
    "SELECT id FROM users WHERE lower(email) = $1",
    [input.email],
  );
  if (existing) {
    return fail("An account with that email already exists.", 409);
  }

  const passwordHash = await hashPassword(input.password);

  const user = await queryOne<{ id: string; name: string; email: string }>(
    `INSERT INTO users (name, email, password_hash, branch, college)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email`,
    [input.name, input.email, passwordHash, input.branch ?? null, input.college ?? null],
  );

  if (!user) return fail("Could not create your account.", 500);

  await createSession(user);
  return ok({ user }, 201);
});
