import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handler, fail, ok } from "@/lib/api";
import {
  DOMAINS,
  averageParameters,
  clamp,
  evaluateAnswer,
  generateNextQuestion,
  generateReport,
  type Difficulty,
  type DomainKey,
  type ParameterScores,
} from "@/lib/interview";

const schema = z.object({
  answer: z.string().max(10_000).default(""),
  mode: z.enum(["text", "voice"]).default("text"),
  durationSecs: z.number().int().min(0).max(3600).optional(),
});

type InterviewRow = {
  id: string;
  role: string;
  domain: DomainKey;
  difficulty: Difficulty;
  question_count: number;
  status: string;
};

type QuestionRow = {
  id: string;
  position: number;
  question: string;
  answer: string | null;
  score: string | null;
  parameters: ParameterScores | null;
};

/**
 * Records the answer to the current question, grades it, and returns
 * either the next question or the finished report.
 */
export const POST = handler(
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await context.params;
    const input = schema.parse(await request.json());

    const interview = await queryOne<InterviewRow>(
      `SELECT id, role, domain, difficulty, question_count, status
         FROM interviews
        WHERE id = $1 AND user_id = $2`,
      [id, user.id],
    );

    if (!interview) return fail("Interview not found.", 404);
    if (interview.status !== "in_progress") {
      return fail("This interview has already been completed.", 409);
    }

    // The question awaiting an answer is the highest-positioned unanswered one.
    const current = await queryOne<QuestionRow>(
      `SELECT id, position, question, answer, score, parameters
         FROM interview_questions
        WHERE interview_id = $1 AND answered_at IS NULL
        ORDER BY position
        LIMIT 1`,
      [id],
    );

    if (!current) return fail("There is no question waiting for an answer.", 409);

    const domainLabel = DOMAINS[interview.domain];

    const evaluation = await evaluateAnswer({
      role: interview.role,
      domain: domainLabel,
      difficulty: interview.difficulty,
      question: current.question,
      answer: input.answer,
    });

    await query(
      `UPDATE interview_questions
          SET answer = $1, answered_at = now(), answer_mode = $2, duration_secs = $3,
              score = $4, feedback = $5, ideal_answer = $6, parameters = $7
        WHERE id = $8`,
      [
        input.answer,
        input.mode,
        input.durationSecs ?? null,
        evaluation.score,
        evaluation.feedback,
        evaluation.idealAnswer,
        JSON.stringify(evaluation.parameters),
        current.id,
      ],
    );

    const isLast = current.position >= interview.question_count;

    if (!isLast) {
      const history = await query<QuestionRow>(
        `SELECT id, position, question, answer, score, parameters
           FROM interview_questions
          WHERE interview_id = $1 AND answered_at IS NOT NULL
          ORDER BY position`,
        [id],
      );

      const next = await generateNextQuestion({
        role: interview.role,
        domain: domainLabel,
        difficulty: interview.difficulty,
        position: current.position + 1,
        total: interview.question_count,
        history: history.map((h) => ({
          question: h.question,
          answer: h.answer,
          score: h.score === null ? null : Number(h.score),
        })),
      });

      await query(
        `INSERT INTO interview_questions (interview_id, position, question, category)
         VALUES ($1, $2, $3, $4)`,
        [id, current.position + 1, next.question, next.category],
      );

      return ok({
        done: false,
        evaluation,
        position: current.position + 1,
        total: interview.question_count,
        question: next.question,
        category: next.category,
      });
    }

    // ── last question answered: build the final report ──────────
    const all = await query<QuestionRow>(
      `SELECT id, position, question, answer, score, parameters
         FROM interview_questions
        WHERE interview_id = $1
        ORDER BY position`,
      [id],
    );

    const scores = all.map((q) => (q.score === null ? 0 : Number(q.score)));
    const overall = clamp(scores.reduce((a, b) => a + b, 0) / (scores.length || 1));
    const parameters = averageParameters(
      all.map((q) => q.parameters).filter((p): p is ParameterScores => !!p),
    );

    const report = await generateReport({
      role: interview.role,
      domain: domainLabel,
      difficulty: interview.difficulty,
      overallScore: overall,
      answers: all.map((q) => ({
        question: q.question,
        answer: q.answer,
        score: q.score === null ? null : Number(q.score),
      })),
    });

    await query(
      `UPDATE interviews
          SET status = 'completed', completed_at = now(), overall_score = $1,
              summary = $2, strengths = $3, improvements = $4, parameters = $5
        WHERE id = $6`,
      [
        overall,
        report.summary,
        report.strengths,
        report.improvements,
        JSON.stringify(parameters),
        id,
      ],
    );

    return ok({
      done: true,
      evaluation,
      interviewId: id,
      overallScore: overall,
      parameters,
      ...report,
    });
  },
);
