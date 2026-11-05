import { query, queryOne } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handler, fail, ok } from "@/lib/api";

/** Full detail for one interview: metadata, report, and every Q&A. */
export const GET = handler(
  async (_request: Request, context: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await context.params;

    const interview = await queryOne(
      `SELECT id, role, domain, difficulty, status, question_count,
              overall_score, summary, strengths, improvements, parameters,
              created_at, completed_at
         FROM interviews
        WHERE id = $1 AND user_id = $2`,
      [id, user.id],
    );

    if (!interview) return fail("Interview not found.", 404);

    const questions = await query(
      `SELECT position, question, category, answer, answer_mode, duration_secs,
              score, feedback, ideal_answer, parameters
         FROM interview_questions
        WHERE interview_id = $1
        ORDER BY position`,
      [id],
    );

    return ok({ interview, questions });
  },
);

/** Marks an in-progress interview as abandoned (student quit early). */
export const DELETE = handler(
  async (_request: Request, context: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await context.params;

    await query(
      `UPDATE interviews SET status = 'abandoned'
        WHERE id = $1 AND user_id = $2 AND status = 'in_progress'`,
      [id, user.id],
    );

    return ok({ success: true });
  },
);
