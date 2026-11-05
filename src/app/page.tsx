import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { DOMAINS } from "@/lib/interview";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4">
        <section className="py-16 sm:py-24">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--brand)]">
            Placement preparation
          </p>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Practise your placement interview before it counts.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-[var(--muted)]">
            Edusys runs a realistic mock interview with an AI interviewer, listens to
            your answers, and scores them on technical accuracy, clarity, depth, and
            communication — so you know exactly where you stand.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn btn-primary">
              Start a mock interview
            </Link>
            <Link href="/login" className="btn btn-secondary">
              I already have an account
            </Link>
          </div>
        </section>

        <section className="grid gap-4 pb-16 sm:grid-cols-3">
          {[
            {
              title: "Adaptive questioning",
              body: "Each question is chosen based on how you answered the last one — stronger answers get harder follow-ups.",
            },
            {
              title: "Answer by voice",
              body: "The interviewer reads questions aloud and transcribes your spoken reply, with your camera on, just like the real thing.",
            },
            {
              title: "Scored feedback",
              body: "Every answer gets a score out of 10, a model answer to compare against, and specific notes on what to fix.",
            },
          ].map((f) => (
            <div key={f.title} className="card p-5">
              <h2 className="font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="pb-20">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            Practice areas
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.values(DOMAINS).map((d) => (
              <span
                key={d}
                className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm"
              >
                {d}
              </span>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] py-6 text-center text-sm text-[var(--muted)]">
        Edusys — Group 38, Department of Computer Engineering, Atharva College of
        Engineering
      </footer>
    </>
  );
}
