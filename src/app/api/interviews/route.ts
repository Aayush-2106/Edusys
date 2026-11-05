import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handler, fail, ok } from "@/lib/api";
import { env } from "@/lib/env";
import { DOMAINS, DIFFICULTIES, generateNextQuestion, type DomainKey } from "@/lib/interview";

const schema = z.object({
  role: z.string().trim().min(2).max(80).default("Software Engineer"),
  domain: z.enum(Object.keys(DOMAINS) as [DomainKey, ...DomainKey[]]),
  difficulty: z.enum(DIFFICULTIES).default("medium"),
  questionCount: z.number().int().min(3).max(15).optional(),
});

/** Starts a new interview and returns its first question. */
export const POST = handler(async (request: Request) => {
  const user = await requireUser();
  const input = schema.parse(await request.json());
  const total = input.questionCount ?? env.questionCount;

  const interview = await queryOne<{ id: string }>(
    `INSERT INTO interviews (user_id, role, domain, difficulty, question_count)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [user.id, input.role, input.domain, input.difficulty, total],
  );

  if (!interview) return fail("Could not start the interview.", 500);

  const first = await generateNextQuestion({
    role: input.role,
    domain: DOMAINS[input.domain],
    difficulty: input.difficulty,
    position: 1,
    total,
    history: [],
  });

  await query(
    `INSERT INTO interview_questions (interview_id, position, question, category)
     VALUES ($1, 1, $2, $3)`,
    [interview.id, first.question, first.category],
  );

  return ok(
    {
      interviewId: interview.id,
      position: 1,
      total,
      question: first.question,
      category: first.category,
    },
    201,
  );
});

/** Lists the signed-in student's past interviews. */
export const GET = handler(async () => {
  const user = await requireUser();

  const rows = await query<{
    id: string;
    role: string;
    domain: string;
    difficulty: string;
    status: string;
    overall_score: string | null;
    question_count: number;
    created_at: string;
    completed_at: string | null;
  }>(
    `SELECT id, role, domain, difficulty, status, overall_score,
            question_count, created_at, completed_at
       FROM interviews
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50`,
    [user.id],
  );

  return ok({ interviews: rows });
});
