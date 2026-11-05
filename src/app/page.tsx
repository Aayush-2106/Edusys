import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { DOMAINS } from "@/lib/interview";

export default async function HomePage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <>
      <SiteHeader />

      <main>
        {/* ── hero ─────────────────────────────────────────── */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div className="anim-rise">
            <span className="chip">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--good)" }}
              />
              AI interviewer · free to practise
            </span>

            <h1 className="t-display mt-5">
              Fail the interview
              <br />
              <span style={{ color: "var(--brand)" }}>before it matters.</span>
            </h1>

            <p className="t-lead mt-5 max-w-lg">
              Edusys runs a real mock interview — it asks, you answer out loud, and it
              tells you exactly where you lost marks. Practise until the actual
              placement interview is the easy one.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn btn-primary">
                Start a mock interview
              </Link>
              <Link href="/login" className="btn btn-secondary">
                Sign in
              </Link>
            </div>

            <p className="mt-4 text-sm text-[var(--ink-3)]">
              No payment, no setup. Your first interview takes about ten minutes.
            </p>
          </div>

          {/* interview preview */}
          <div className="anim-rise" style={{ animationDelay: "90ms" }}>
            <InterviewPreview />
          </div>
        </section>

        {/* ── how it works ─────────────────────────────────── */}
        <section className="border-y border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <p className="t-eyebrow">How it works</p>
            <h2 className="t-h1 mt-2 max-w-xl">
              Three steps, and you know where you stand.
            </h2>

            <ol className="mt-10 grid gap-8 sm:grid-cols-3">
              {[
                {
                  n: "01",
                  title: "Pick your focus",
                  body: "Choose a role, a subject, and how hard you want it. Eight areas from DSA to HR.",
                },
                {
                  n: "02",
                  title: "Answer out loud",
                  body: "The interviewer speaks each question and transcribes your reply. Camera on, like the real thing. Each question adapts to how you did on the last.",
                },
                {
                  n: "03",
                  title: "Read the damage",
                  body: "Every answer scored out of 10, with what a strong answer would have covered and what to fix next.",
                },
              ].map((s) => (
                <li key={s.n}>
                  <span
                    className="t-num text-sm font-bold"
                    style={{ color: "var(--brand)" }}
                  >
                    {s.n}
                  </span>
                  <h3 className="t-h2 mt-2">{s.title}</h3>
                  <p className="t-body mt-1.5">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── what you're scored on ────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <p className="t-eyebrow">The scoring</p>
              <h2 className="t-h1 mt-2">
                Four parameters, scored strictly.
              </h2>
              <p className="t-body mt-4 max-w-md">
                The interviewer is told not to inflate scores — an encouraging number
                that leaves you unprepared is worse than an honest low one. If your
                answer was vague, it says so.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {Object.values(DOMAINS).map((d) => (
                  <span key={d} className="chip">
                    {d}
                  </span>
                ))}
              </div>
            </div>

            <ScorecardPreview />
          </div>
        </section>

        {/* ── cta ──────────────────────────────────────────── */}
        <section className="border-t border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto max-w-6xl px-4 py-16 text-center">
            <h2 className="t-h1">Your first interview shouldn&apos;t be the real one.</h2>
            <p className="t-body mx-auto mt-3 max-w-md">
              Practise as many times as you like. Track whether you&apos;re actually
              getting better.
            </p>
            <Link href="/register" className="btn btn-primary mt-7">
              Create a free account
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-10 text-center text-sm text-[var(--ink-3)]">
        <p className="font-semibold text-[var(--ink-2)]">Edusys</p>
        <p className="mt-1">
          Group 38 · Department of Computer Engineering · Atharva College of Engineering
        </p>
      </footer>
    </>
  );
}

/** Static mock of the interview screen, used as the hero visual. */
function InterviewPreview() {
  return (
    <div className="card-raised overflow-hidden" style={{ background: "var(--surface)" }}>
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--bad-text)]">
          <span
            className="anim-dot h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--bad)" }}
          />
          Recording
        </span>
        <span className="ml-auto t-num text-xs text-[var(--ink-3)]">
          Question 3 of 8
        </span>
      </div>

      <div className="grid grid-cols-[1fr_96px] gap-3 p-4">
        <div
          className="flex aspect-video flex-col justify-center rounded-lg px-5"
          style={{ background: "var(--surface-2)" }}
        >
          <p className="t-eyebrow">Database indexing</p>
          <p className="mt-2 text-[0.9375rem] font-medium leading-snug">
            How does a covering index reduce lookup overhead, and what do you give up
            in return?
          </p>
        </div>

        <div
          className="flex aspect-[3/4] items-end justify-center rounded-lg pb-2"
          style={{
            background: "linear-gradient(160deg, #2b3340, #171c24)",
          }}
        >
          <span className="rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
            You
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 pb-4">
        <span className="chip" style={{ borderColor: "var(--bad)" }}>
          <span
            className="anim-dot h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--bad)" }}
          />
          Listening…
        </span>
        <span className="ml-auto text-xs text-[var(--ink-3)]">
          &ldquo;A covering index includes every column the query needs, so…&rdquo;
        </span>
      </div>
    </div>
  );
}

/** Static mock of a scorecard. */
function ScorecardPreview() {
  const rows = [
    { label: "Technical accuracy", score: 8.2 },
    { label: "Clarity of explanation", score: 6.5 },
    { label: "Depth and detail", score: 4.8 },
    { label: "Communication", score: 7.4 },
  ];

  return (
    <div className="card-raised p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="t-eyebrow">Your report</p>
          <p className="t-h2 mt-1">Database Management Systems</p>
        </div>
        <div className="text-right">
          <p
            className="t-num text-4xl font-bold leading-none"
            style={{ color: "var(--mid-text)" }}
          >
            6.7
          </p>
          <p className="text-xs text-[var(--ink-3)]">out of 10</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-sm font-medium">{r.label}</span>
              <span
                className="t-num text-sm font-bold"
                style={{
                  color:
                    r.score >= 7
                      ? "var(--good-text)"
                      : r.score >= 5
                        ? "var(--mid-text)"
                        : "var(--bad-text)",
                }}
              >
                {r.score.toFixed(1)}
              </span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full"
              style={{ background: "var(--grid)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${r.score * 10}%`,
                  background:
                    r.score >= 7
                      ? "var(--good)"
                      : r.score >= 5
                        ? "var(--mid)"
                        : "var(--bad)",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 border-t border-[var(--border)] pt-4 text-sm leading-relaxed text-[var(--ink-2)]">
        <span className="font-semibold text-[var(--ink)]">Where you lost marks:</span>{" "}
        you named the right concepts but stopped at definitions. Add a trade-off or a
        concrete example to each answer.
      </p>
    </div>
  );
}
