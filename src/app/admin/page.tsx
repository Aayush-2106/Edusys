import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { ScorePill, ScoreBar } from "@/components/ScorePill";
import { StudentSearch } from "@/components/StudentSearch";
import {
  getCohortSummary,
  getDomainBreakdown,
  getParameterAverages,
  listStudents,
} from "@/lib/admin";
import { PARAMETERS, type ParameterKey } from "@/lib/interview";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");

  const { q } = await searchParams;

  const [summary, students, domains, parameters] = await Promise.all([
    getCohortSummary(),
    listStudents(q),
    getDomainBreakdown(),
    getParameterAverages(),
  ]);

  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-10">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wider text-[var(--brand)]">
            Placement cell
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Cohort overview</h1>
          <p className="mt-1 text-sm text-[var(--ink-3)]">
            Interview activity and readiness across all registered students.
          </p>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Students registered" value={String(summary.students)} />
          <Stat
            label="Have practised"
            value={`${summary.activeStudents}/${summary.students}`}
            hint={
              summary.students > 0
                ? `${Math.round((summary.activeStudents / summary.students) * 100)}% engagement`
                : undefined
            }
          />
          <Stat
            label="Interviews completed"
            value={String(summary.completed)}
            hint={
              summary.interviews > summary.completed
                ? `${summary.interviews - summary.completed} not finished`
                : undefined
            }
          />
          <Stat
            label="Cohort average"
            value={
              summary.averageScore === null
                ? "—"
                : `${summary.averageScore.toFixed(1)}/10`
            }
            hint={`${summary.readyCount} scoring 7+`}
          />
        </section>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="card p-6">
            <h2 className="font-semibold">Weakest subjects</h2>
            <p className="mb-4 mt-1 text-sm text-[var(--ink-3)]">
              Lowest average first — where the cohort needs teaching support.
            </p>

            {domains.length === 0 ? (
              <Empty>No completed interviews yet.</Empty>
            ) : (
              <div className="space-y-3">
                {domains.map((d) => (
                  <div key={d.domain}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate">{d.label}</span>
                      <span className="shrink-0 text-xs text-[var(--ink-3)]">
                        {d.attempts} attempt{d.attempts === 1 ? "" : "s"}
                      </span>
                    </div>
                    <ScoreBar label="" score={d.averageScore} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card p-6">
            <h2 className="font-semibold">Skill breakdown</h2>
            <p className="mb-4 mt-1 text-sm text-[var(--ink-3)]">
              Averaged across every scored answer in the cohort.
            </p>

            {summary.completed === 0 ? (
              <Empty>No completed interviews yet.</Empty>
            ) : (
              <div className="space-y-3">
                {(Object.keys(PARAMETERS) as ParameterKey[]).map((key) => (
                  <ScoreBar
                    key={key}
                    label={PARAMETERS[key]}
                    score={parameters[key] ?? 0}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="mt-10">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--ink-3)]">
              Students{q ? ` matching “${q}”` : ""}
            </h2>
            <StudentSearch initial={q ?? ""} />
          </div>

          {students.length === 0 ? (
            <div className="card p-8 text-center text-[var(--ink-3)]">
              {q ? `No students match “${q}”.` : "No students have registered yet."}
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wider text-[var(--ink-3)]">
                    <th className="px-4 py-3 font-semibold">Student</th>
                    <th className="px-4 py-3 font-semibold">Branch</th>
                    <th className="px-4 py-3 text-right font-semibold">Completed</th>
                    <th className="px-4 py-3 text-right font-semibold">Average</th>
                    <th className="px-4 py-3 text-right font-semibold">Best</th>
                    <th className="px-4 py-3 text-right font-semibold">Last active</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/students/${s.id}`}
                          className="font-semibold text-[var(--brand)]"
                        >
                          {s.name}
                        </Link>
                        <div className="text-xs text-[var(--ink-3)]">{s.email}</div>
                      </td>
                      <td className="px-4 py-3 text-[var(--ink-3)]">{s.branch ?? "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{s.completed}</td>
                      <td className="px-4 py-3 text-right">
                        {s.averageScore === null ? (
                          <span className="text-[var(--ink-3)]">—</span>
                        ) : (
                          <ScorePill score={s.averageScore} />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {s.bestScore === null ? "—" : s.bestScore.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-[var(--ink-3)]">
                        {s.lastActivity
                          ? new Date(s.lastActivity).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })
                          : "Never"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-3)]">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-[var(--ink-3)]">{hint}</p>}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-[var(--ink-3)]">{children}</p>;
}
