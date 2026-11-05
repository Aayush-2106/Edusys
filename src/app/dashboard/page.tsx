import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { SiteHeader } from "@/components/SiteHeader";
import { DOMAINS, PARAMETERS, type DomainKey, type ParameterKey } from "@/lib/interview";
import { ScorePill, ScoreBar, bandText, bandLabel } from "@/components/ScorePill";
import { ProgressChart } from "@/components/ProgressChart";

type Row = {
  id: string;
  role: string;
  domain: DomainKey;
  difficulty: string;
  status: "in_progress" | "completed" | "abandoned";
  overall_score: string | null;
  question_count: number;
  parameters: Record<ParameterKey, number> | null;
  created_at: Date;
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const interviews = await query<Row>(
    `SELECT id, role, domain, difficulty, status, overall_score,
            question_count, parameters, created_at
       FROM interviews
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50`,
    [user.id],
  );

  const completed = interviews.filter((i) => i.status === "completed");
  const inProgress = interviews.find((i) => i.status === "in_progress");
  const scores = completed.map((i) => Number(i.overall_score ?? 0));
  const average = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  // Oldest → newest so the chart reads left to right.
  const chronological = [...completed].reverse();

  const points = chronological.map((i) => ({
    id: i.id,
    score: Number(i.overall_score ?? 0),
    label: DOMAINS[i.domain] ?? i.domain,
    date: new Date(i.created_at).toISOString(),
  }));

  // Improvement = last three vs first three, once there's enough history.
  const delta =
    chronological.length >= 4
      ? avg(points.slice(-3).map((p) => p.score)) -
        avg(points.slice(0, 3).map((p) => p.score))
      : null;

  const parameterKeys = Object.keys(PARAMETERS) as ParameterKey[];
  const parameterAverages = Object.fromEntries(
    parameterKeys.map((key) => {
      const values = completed
        .map((i) => i.parameters?.[key])
        .filter((v): v is number => typeof v === "number");
      return [key, values.length ? avg(values) : 0];
    }),
  ) as Record<ParameterKey, number>;

  const weakest = [...parameterKeys].sort(
    (a, b) => parameterAverages[a] - parameterAverages[b],
  )[0];

  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="t-h1">Hello, {user.name.split(" ")[0]}</h1>
            <p className="t-body mt-1">
              {completed.length === 0
                ? "Let's find out where you stand."
                : average !== null &&
                  `You're averaging ${average.toFixed(1)} out of 10 across ${
                    completed.length
                  } interview${completed.length === 1 ? "" : "s"}.`}
            </p>
          </div>

          <Link href="/interview/new" className="btn btn-primary">
            New interview
          </Link>
        </div>

        {inProgress && (
          <Link
            href={`/interview/${inProgress.id}`}
            className="card card-link mt-6 flex items-center justify-between gap-4 p-4"
            style={{ borderColor: "var(--brand)", background: "var(--brand-wash)" }}
          >
            <div>
              <p className="t-h2">Interview in progress</p>
              <p className="t-body mt-0.5">
                {DOMAINS[inProgress.domain] ?? inProgress.domain} · pick up where you
                left off
              </p>
            </div>
            <span className="btn btn-primary btn-sm">Resume</span>
          </Link>
        )}

        {completed.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <section className="mt-7 grid gap-3 sm:grid-cols-3">
              <Stat
                label="Average score"
                value={average === null ? "—" : average.toFixed(1)}
                suffix="/10"
                tone={average === null ? undefined : bandText(average)}
                hint={average === null ? undefined : bandLabel(average)}
              />
              <Stat
                label="Best score"
                value={scores.length ? Math.max(...scores).toFixed(1) : "—"}
                suffix="/10"
              />
              <Stat
                label="Interviews done"
                value={String(completed.length)}
                hint={
                  delta === null
                    ? "Complete 4 to see your trend"
                    : delta >= 0.2
                      ? `Up ${delta.toFixed(1)} since you started`
                      : delta <= -0.2
                        ? `Down ${Math.abs(delta).toFixed(1)} since you started`
                        : "Holding steady"
                }
              />
            </section>

            {points.length >= 2 && (
              <section className="card mt-4 p-6">
                <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="t-h2">Your scores over time</h2>
                  <p className="text-xs text-[var(--ink-3)]">
                    Hover a point for detail
                  </p>
                </div>
                <ProgressChart points={points} />
              </section>
            )}

            <section className="card mt-4 p-6">
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="t-h2">Where you&apos;re strong and weak</h2>
                <p className="text-xs text-[var(--ink-3)]">
                  Averaged across all answers
                </p>
              </div>

              <div className="space-y-4">
                {parameterKeys.map((key) => (
                  <ScoreBar
                    key={key}
                    label={PARAMETERS[key]}
                    score={parameterAverages[key]}
                  />
                ))}
              </div>

              {weakest && parameterAverages[weakest] > 0 && (
                <p className="mt-5 border-t border-[var(--border)] pt-4 text-sm text-[var(--ink-2)]">
                  <span className="font-semibold text-[var(--ink)]">Focus next on</span>{" "}
                  {PARAMETERS[weakest].toLowerCase()} — it&apos;s your lowest parameter
                  at {parameterAverages[weakest].toFixed(1)}.
                </p>
              )}
            </section>
          </>
        )}

        <section className="mt-10">
          <h2 className="t-eyebrow mb-3">History</h2>

          {interviews.length === 0 ? (
            <div className="card p-6 text-center text-sm text-[var(--ink-3)]">
              Nothing here yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {interviews.map((item) => (
                <li key={item.id}>
                  <Link
                    href={
                      item.status === "in_progress"
                        ? `/interview/${item.id}`
                        : `/report/${item.id}`
                    }
                    className="card card-link flex items-center justify-between gap-4 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {DOMAINS[item.domain] ?? item.domain}
                      </p>
                      <p className="mt-0.5 text-sm text-[var(--ink-3)]">
                        {item.role} · {item.difficulty} · {item.question_count}{" "}
                        questions ·{" "}
                        {new Date(item.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    {item.status === "completed" ? (
                      <ScorePill score={Number(item.overall_score ?? 0)} />
                    ) : (
                      <span className="chip shrink-0">
                        {item.status === "in_progress" ? "Resume" : "Abandoned"}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

function avg(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
}

function Stat({
  label,
  value,
  suffix,
  hint,
  tone,
}: {
  label: string;
  value: string;
  suffix?: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="card p-4">
      <p className="t-eyebrow">{label}</p>
      <p className="t-num mt-2 text-3xl font-bold leading-none" style={{ color: tone }}>
        {value}
        {suffix && (
          <span className="text-base font-medium text-[var(--ink-3)]">{suffix}</span>
        )}
      </p>
      {hint && <p className="mt-1.5 text-xs text-[var(--ink-3)]">{hint}</p>}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card mt-7 px-6 py-12 text-center">
      <h2 className="t-h2">You haven&apos;t practised yet</h2>
      <p className="t-body mx-auto mt-2 max-w-sm">
        Your first interview takes about ten minutes. You&apos;ll get a score out of 10
        and a breakdown of exactly where you lost marks.
      </p>
      <Link href="/interview/new" className="btn btn-primary mt-6">
        Start your first interview
      </Link>
    </div>
  );
}
