import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { SiteHeader } from "@/components/SiteHeader";
import { ScorePill, ScoreBar } from "@/components/ScorePill";
import { DOMAINS, PARAMETERS, type DomainKey, type ParameterKey } from "@/lib/interview";

type Student = {
  id: string;
  name: string;
  email: string;
  branch: string | null;
  college: string | null;
  created_at: Date;
};

type InterviewRow = {
  id: string;
  role: string;
  domain: DomainKey;
  difficulty: string;
  status: string;
  overall_score: string | null;
  summary: string | null;
  parameters: Record<ParameterKey, number> | null;
  created_at: Date;
};

export default async function AdminStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");
  if (viewer.role !== "admin") redirect("/dashboard");

  const { id } = await params;

  const student = await queryOne<Student>(
    `SELECT id, name, email, branch, college, created_at
       FROM users WHERE id = $1 AND role = 'student'`,
    [id],
  );

  if (!student) notFound();

  const interviews = await query<InterviewRow>(
    `SELECT id, role, domain, difficulty, status, overall_score, summary,
            parameters, created_at
       FROM interviews
      WHERE user_id = $1
      ORDER BY created_at DESC`,
    [id],
  );

  const completed = interviews.filter((i) => i.status === "completed");
  const scores = completed.map((i) => Number(i.overall_score ?? 0));
  const average = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  // Trend: oldest to newest, so improvement reads left to right.
  const trend = [...completed].reverse();

  // Average each parameter across this student's completed interviews.
  const parameterKeys = Object.keys(PARAMETERS) as ParameterKey[];
  const parameterAverages = Object.fromEntries(
    parameterKeys.map((key) => {
      const values = completed
        .map((i) => i.parameters?.[key])
        .filter((v): v is number => typeof v === "number");
      return [
        key,
        values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      ];
    }),
  ) as Record<ParameterKey, number>;

  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-4 py-10">
        <Link href="/admin" className="text-sm font-semibold text-[var(--brand)]">
          ← All students
        </Link>

        <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{student.name}</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {student.email}
              {student.branch && ` · ${student.branch}`}
              {` · joined ${new Date(student.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}`}
            </p>
          </div>
          {average !== null && <ScorePill score={average} large />}
        </header>

        {completed.length === 0 ? (
          <div className="card mt-8 p-8 text-center text-[var(--muted)]">
            This student has not completed any interviews yet.
          </div>
        ) : (
          <>
            <section className="mt-6 grid gap-3 sm:grid-cols-3">
              <Stat label="Completed" value={String(completed.length)} />
              <Stat
                label="Average"
                value={average === null ? "—" : `${average.toFixed(1)}/10`}
              />
              <Stat label="Best" value={`${Math.max(...scores).toFixed(1)}/10`} />
            </section>

            {trend.length > 1 && (
              <section className="card mt-4 p-6">
                <h2 className="mb-4 font-semibold">Score over time</h2>
                <div className="flex items-end gap-2" style={{ height: 140 }}>
                  {trend.map((i) => {
                    const score = Number(i.overall_score ?? 0);
                    const tone =
                      score >= 7
                        ? "var(--success)"
                        : score >= 5
                          ? "var(--warning)"
                          : "var(--danger)";
                    return (
                      <div
                        key={i.id}
                        className="flex flex-1 flex-col items-center justify-end gap-1"
                        title={`${DOMAINS[i.domain] ?? i.domain} — ${score.toFixed(1)}/10`}
                      >
                        <span className="text-xs font-semibold tabular-nums">
                          {score.toFixed(1)}
                        </span>
                        <div
                          className="w-full rounded-t"
                          style={{
                            height: `${Math.max(4, score * 10)}%`,
                            background: tone,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-center text-xs text-[var(--muted)]">
                  Oldest to most recent
                </p>
              </section>
            )}

            <section className="card mt-4 p-6">
              <h2 className="mb-4 font-semibold">Skill breakdown</h2>
              <div className="space-y-3">
                {parameterKeys.map((key) => (
                  <ScoreBar
                    key={key}
                    label={PARAMETERS[key]}
                    score={parameterAverages[key]}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            Interview history
          </h2>

          {interviews.length === 0 ? (
            <div className="card p-8 text-center text-[var(--muted)]">
              Nothing to show yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {interviews.map((i) => (
                <li key={i.id} className="card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {DOMAINS[i.domain] ?? i.domain}
                      </p>
                      <p className="mt-0.5 text-sm text-[var(--muted)]">
                        {i.role} · {i.difficulty} ·{" "}
                        {new Date(i.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    {i.status === "completed" ? (
                      <ScorePill score={Number(i.overall_score ?? 0)} />
                    ) : (
                      <span className="shrink-0 rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                        {i.status === "in_progress" ? "In progress" : "Abandoned"}
                      </span>
                    )}
                  </div>

                  {i.summary && (
                    <p className="mt-3 border-t border-[var(--border)] pt-3 text-sm leading-relaxed text-[var(--muted)]">
                      {i.summary}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
