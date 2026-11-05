"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DOMAINS, DIFFICULTIES } from "@/lib/interview";

export function NewInterviewForm({
  defaultQuestionCount,
}: {
  defaultQuestionCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: form.get("role"),
          domain: form.get("domain"),
          difficulty: form.get("difficulty"),
          questionCount: Number(form.get("questionCount")),
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? "Could not start the interview.");
        return;
      }

      router.push(`/interview/${json.interviewId}`);
    } catch {
      setError("Could not reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card mt-7 space-y-5 p-6">
      <div>
        <label className="label" htmlFor="role">
          Target role
        </label>
        <input
          id="role"
          name="role"
          className="input"
          defaultValue="Software Engineer"
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="domain">
          Focus area
        </label>
        <select id="domain" name="domain" className="input" defaultValue="dsa">
          {Object.entries(DOMAINS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="difficulty">
          Difficulty
        </label>
        <select id="difficulty" name="difficulty" className="input" defaultValue="medium">
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d[0].toUpperCase() + d.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="questionCount">
          Number of questions
        </label>
        <input
          id="questionCount"
          name="questionCount"
          type="number"
          min={3}
          max={15}
          defaultValue={defaultQuestionCount}
          className="input"
        />
        <p className="mt-1.5 text-xs text-[var(--muted)]">
          Allow roughly two minutes per question.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-[var(--danger)] px-3 py-2 text-sm text-[var(--danger)]"
        >
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn btn-primary w-full">
        {busy ? "Preparing your first question…" : "Begin interview"}
      </button>
    </form>
  );
}
