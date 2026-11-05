import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { SiteHeader } from "@/components/SiteHeader";
import { DOMAINS, type DomainKey } from "@/lib/interview";
import { ScorePill } from "@/components/ScorePill";

type Row = {
  id: string;
  role: string;
  domain: DomainKey;
  difficulty: string;
  status: "in_progress" | "completed" | "abandoned";
  overall_score: string | null;
  question_count: number;
  created_at: Date;
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const interviews = await query<Row>(
    `SELECT id, role, domain, difficulty, status, overall_score,
            question_count, created_at
       FROM interviews
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50`,
    [user.id],
  );

  const completed = interviews.filter((i) => i.status === "completed");
  const scores = completed.map((i) => Number(i.overall_score ?? 0));
  const average = scores.length
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : null;
  const best = scores.length ? Math.max(...scores) : null;

  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Hello, {user.name.split(" ")[0]}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {completed.length === 0
                ? "You haven't completed an interview yet."
                : `${completed.length} interview${completed.length === 1 ? "" : "s"} completed.`}
            </p>
          </div>

          <Link href="/interview/new" className="btn btn-primary">
            New mock interview
          </Link>
        </div>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label="Interviews completed" value={String(completed.length)} />
          <Stat
            label="Average score"
            value={average === null ? "—" : `${average.toFixed(1)}/10`}
          />
          <Stat label="Best score" value={best === null ? "—" : `${best.toFixed(1)}/10`} />
        </section>

        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            History
          </h2>

          {interviews.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-[var(--muted)]">
                Your past interviews and scores will appear here.
              </p>
              <Link href="/interview/new" className="btn btn-primary mt-4">
                Start your first interview
              </Link>
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
                    className="card flex items-center justify-between gap-4 p-4 transition hover:border-[var(--brand)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {DOMAINS[item.domain] ?? item.domain}
                      </p>
                      <p className="mt-0.5 text-sm text-[var(--muted)]">
                        {item.role} · {item.difficulty} · {item.question_count} questions
                        {" · "}
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
                      <span className="shrink-0 rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-bold">{value}</p>
    </div>
  );
}
