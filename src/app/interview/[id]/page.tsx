import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { SiteHeader } from "@/components/SiteHeader";
import { InterviewSession } from "@/components/InterviewSession";
import { DOMAINS, type DomainKey } from "@/lib/interview";
import { clientFlags } from "@/lib/env";

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const interview = await queryOne<{
    id: string;
    role: string;
    domain: DomainKey;
    difficulty: string;
    question_count: number;
    status: string;
  }>(
    `SELECT id, role, domain, difficulty, question_count, status
       FROM interviews WHERE id = $1 AND user_id = $2`,
    [id, user.id],
  );

  if (!interview) notFound();
  if (interview.status !== "in_progress") redirect(`/report/${id}`);

  const current = await queryOne<{ position: number; question: string; category: string }>(
    `SELECT position, question, category
       FROM interview_questions
      WHERE interview_id = $1 AND answered_at IS NULL
      ORDER BY position LIMIT 1`,
    [id],
  );

  if (!current) redirect(`/report/${id}`);

  return (
    <>
      <SiteHeader />
      <InterviewSession
        interviewId={interview.id}
        domainLabel={DOMAINS[interview.domain] ?? interview.domain}
        role={interview.role}
        total={interview.question_count}
        initialPosition={current.position}
        initialQuestion={current.question}
        initialCategory={current.category}
        webcamPreview={clientFlags.webcamPreview}
        webcamRecording={clientFlags.webcamRecording}
      />
    </>
  );
}
