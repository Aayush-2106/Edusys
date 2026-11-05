import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { SiteHeader } from "@/components/SiteHeader";
import { ScorePill, ScoreBar } from "@/components/ScorePill";
import { DOMAINS, PARAMETERS, type DomainKey, type ParameterKey } from "@/lib/interview";

type InterviewRow = {
  id: string;
  role: string;
  domain: DomainKey;
  difficulty: string;
  status: string;
  overall_score: string | null;
  summary: string | null;
  strengths: string[] | null;
  improvements: string[] | null;
  parameters: Record<ParameterKey, number> | null;
  completed_at: Date | null;
};

type QuestionRow = {
  position: number;
  question: string;
  category: string | null;
  answer: string | null;
  answer_mode: string | null;
  duration_secs: number | null;
  score: string | null;
  feedback: string | null;
  ideal_answer: string | null;
};

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const interview = await queryOne<InterviewRow>(
    `SELECT id, role, domain, difficulty, status, overall_score, summary,
            strengths, improvements, parameters, completed_at
       FROM interviews WHERE id = $1 AND user_id = $2`,
    [id, user.id],
  );

  if (!interview) notFound();
  if (interview.status === "in_progress") redirect(`/interview/${id}`);

  const questions = await query<QuestionRow>(
    `SELECT position, question, category, answer, answer_mode, duration_secs,
            score, feedback, ideal_answer
       FROM interview_questions
      WHERE interview_id = $1
      ORDER BY position`,
    [id],
  );

  const overall = Number(interview.overall_score ?? 0);
  const answered = questions.filter((q) => q.score !== null);

  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/dashboard" className="text-sm font-semibold text-[var(--brand)]">
          ← Back to dashboard
        </Link>

        <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Performance report</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {DOMAINS[interview.domain] ?? interview.domain} · {interview.role} ·{" "}
              {interview.difficulty}
              {interview.completed_at &&
                ` · ${new Date(interview.completed_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}`}
            </p>
          </div>
          <ScorePill score={overall} large />
        </header>

        {interview.status === "abandoned" && (
          <p className="mt-6 rounded-lg border border-[var(--warning)] px-4 py-3 text-sm text-[var(--warning)]">
            This interview was ended early, so the report covers only the{" "}
            {answered.length} question{answered.length === 1 ? "" : "s"} you answered.
          </p>
        )}

        {interview.summary && (
          <section className="card mt-6 p-6">
            <h2 className="mb-2 font-semibold">Overall assessment</h2>
            <p className="leading-relaxed text-[var(--muted)]">{interview.summary}</p>
          </section>
        )}

        {interview.parameters && (
          <section className="card mt-4 p-6">
            <h2 className="mb-4 font-semibold">Score breakdown</h2>
            <div className="space-y-3">
              {(Object.keys(PARAMETERS) as ParameterKey[]).map((key) => (
                <ScoreBar
                  key={key}
                  label={PARAMETERS[key]}
                  score={interview.parameters?.[key] ?? 0}
                />
              ))}
            </div>
          </section>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {interview.strengths && interview.strengths.length > 0 && (
            <section className="card p-6">
              <h2 className="mb-3 font-semibold text-[var(--success)]">Strengths</h2>
              <ul className="space-y-2 text-sm leading-relaxed text-[var(--muted)]">
                {interview.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-[var(--success)]">✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {interview.improvements && interview.improvements.length > 0 && (
            <section className="card p-6">
              <h2 className="mb-3 font-semibold text-[var(--warning)]">
                Areas to improve
              </h2>
              <ul className="space-y-2 text-sm leading-relaxed text-[var(--muted)]">
                {interview.improvements.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-[var(--warning)]">→</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            Question by question
          </h2>

          <div className="space-y-3">
            {questions.map((q) => (
              <details key={q.position} className="card group p-5" open={q.position === 1}>
                <summary className="flex cursor-pointer items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                      Question {q.position}
                      {q.category ? ` · ${q.category}` : ""}
                    </p>
                    <p className="mt-1 font-medium">{q.question}</p>
                  </div>
                  {q.score !== null ? (
                    <ScorePill score={Number(q.score)} />
                  ) : (
                    <span className="shrink-0 text-xs text-[var(--muted)]">
                      Not reached
                    </span>
                  )}
                </summary>

                <div className="mt-4 space-y-4 border-t border-[var(--border)] pt-4">
                  <Block title="Your answer">
                    {q.answer?.trim() ? (
                      <>
                        {q.answer}
                        {(q.answer_mode || q.duration_secs !== null) && (
                          <span className="mt-1 block text-xs text-[var(--muted)]">
                            {q.answer_mode === "voice" ? "Spoken" : "Typed"}
                            {q.duration_secs !== null && ` · ${q.duration_secs}s`}
                          </span>
                        )}
                      </>
                    ) : (
                      <em className="text-[var(--muted)]">No answer given.</em>
                    )}
                  </Block>

                  {q.feedback && <Block title="Feedback">{q.feedback}</Block>}

                  {q.ideal_answer && (
                    <Block title="What a strong answer covers">{q.ideal_answer}</Block>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/interview/new" className="btn btn-primary">
            Practise again
          </Link>
          <Link href="/dashboard" className="btn btn-secondary">
            Back to dashboard
          </Link>
        </div>
      </main>
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        {title}
      </p>
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  );
}
