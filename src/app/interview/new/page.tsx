import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { NewInterviewForm } from "@/components/NewInterviewForm";
import { env } from "@/lib/env";

export default async function NewInterviewPage() {
  if (!(await getCurrentUser())) redirect("/login");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-2xl font-bold tracking-tight">Set up your interview</h1>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          The interviewer adapts its questions as you go, so answer as you would in a
          real interview.
        </p>
        <NewInterviewForm defaultQuestionCount={env.questionCount} />
      </main>
    </>
  );
}
