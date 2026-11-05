"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { WebcamPanel } from "./WebcamPanel";

type Props = {
  interviewId: string;
  domainLabel: string;
  role: string;
  total: number;
  initialPosition: number;
  initialQuestion: string;
  initialCategory: string;
  webcamPreview: boolean;
  webcamRecording: boolean;
};

export function InterviewSession({
  interviewId,
  domainLabel,
  role,
  total,
  initialPosition,
  initialQuestion,
  initialCategory,
  webcamPreview,
  webcamRecording,
}: Props) {
  const router = useRouter();

  const [position, setPosition] = useState(initialPosition);
  const [question, setQuestion] = useState(initialQuestion);
  const [category, setCategory] = useState(initialCategory);
  const [typed, setTyped] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const speech = useSpeechRecognition();
  const voice = useSpeechSynthesis();

  const startedAtRef = useRef(Date.now());

  // Read each new question aloud once it appears.
  useEffect(() => {
    voice.speak(question);
    startedAtRef.current = Date.now();
    // Intentionally keyed on the question text only — re-speaking on every
    // render of the same question would stutter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question]);

  // The answer is whatever the student typed plus anything transcribed.
  const spoken = [speech.transcript, speech.interimTranscript]
    .filter(Boolean)
    .join(" ")
    .trim();
  const answer = [typed.trim(), spoken].filter(Boolean).join(" ").trim();

  const submit = useCallback(async () => {
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    speech.stop();
    voice.cancel();

    const durationSecs = Math.round((Date.now() - startedAtRef.current) / 1000);

    try {
      const response = await fetch(`/api/interviews/${interviewId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer,
          mode: speech.transcript ? "voice" : "text",
          durationSecs,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        setError(json.error ?? "Could not submit your answer.");
        return;
      }

      if (json.done) {
        router.push(`/report/${interviewId}`);
        return;
      }

      setPosition(json.position);
      setQuestion(json.question);
      setCategory(json.category);
      setTyped("");
      speech.reset();
    } catch {
      setError("Could not reach the server. Your answer was not saved — try again.");
    } finally {
      setSubmitting(false);
    }
  }, [answer, interviewId, router, speech, submitting, voice]);

  async function quit() {
    if (!confirm("End this interview? It will be marked as abandoned.")) return;
    speech.stop();
    voice.cancel();
    await fetch(`/api/interviews/${interviewId}`, { method: "DELETE" });
    router.push("/dashboard");
  }

  const progress = Math.round(((position - 1) / total) * 100);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold">
            Question {position} of {total}
          </span>
          <span className="text-[var(--muted)]">
            {domainLabel} · {role}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className="h-full rounded-full bg-[var(--brand)] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          {/* question */}
          <section className="card p-6">
            {category && (
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--brand)]">
                {category}
              </p>
            )}
            <p className="text-xl font-medium leading-relaxed">{question}</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {voice.supported && (
                <>
                  <button
                    type="button"
                    onClick={() => voice.speak(question)}
                    className="btn btn-secondary"
                    disabled={voice.speaking}
                  >
                    {voice.speaking ? "Speaking…" : "Repeat question"}
                  </button>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--muted)]">
                    <input
                      type="checkbox"
                      checked={voice.enabled}
                      onChange={(e) => {
                        voice.setEnabled(e.target.checked);
                        if (!e.target.checked) voice.cancel();
                      }}
                    />
                    Read questions aloud
                  </label>
                </>
              )}
            </div>
          </section>

          {/* answer */}
          <section className="card mt-4 p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Your answer</h2>

              {speech.supported ? (
                <button
                  type="button"
                  onClick={speech.listening ? speech.stop : speech.start}
                  disabled={submitting}
                  className={`btn ${speech.listening ? "btn-secondary" : "btn-primary"}`}
                >
                  {speech.listening ? (
                    <>
                      <span className="recording-dot inline-block h-2 w-2 rounded-full bg-red-500" />
                      Stop recording
                    </>
                  ) : (
                    "Answer by voice"
                  )}
                </button>
              ) : (
                <span className="text-xs text-[var(--muted)]">
                  Voice input needs Chrome or Edge
                </span>
              )}
            </div>

            {speech.transcript && (
              <div className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Transcribed
                </p>
                <p className="text-sm leading-relaxed">
                  {speech.transcript}
                  {speech.interimTranscript && (
                    <span className="text-[var(--muted)]"> {speech.interimTranscript}</span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={speech.reset}
                  className="mt-2 text-xs font-semibold text-[var(--brand)]"
                >
                  Clear transcript
                </button>
              </div>
            )}

            <textarea
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              rows={6}
              disabled={submitting}
              placeholder={
                speech.listening
                  ? "Listening… you can also type to add to your answer."
                  : "Type your answer here, or use voice above."
              }
              className="input resize-y"
            />

            {speech.error && (
              <p className="mt-2 text-sm text-[var(--warning)]">{speech.error}</p>
            )}
            {error && (
              <p role="alert" className="mt-2 text-sm text-[var(--danger)]">
                {error}
              </p>
            )}

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={quit}
                className="text-sm font-semibold text-[var(--muted)] hover:text-[var(--danger)]"
              >
                End interview
              </button>

              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="btn btn-primary"
              >
                {submitting
                  ? "Evaluating…"
                  : position >= total
                    ? "Finish and see report"
                    : "Submit and continue"}
              </button>
            </div>

            {!answer && !submitting && (
              <p className="mt-2 text-right text-xs text-[var(--muted)]">
                Submitting without an answer scores zero for this question.
              </p>
            )}
          </section>
        </div>

        {/* sidebar */}
        <aside className="space-y-4">
          {webcamPreview && <WebcamPanel recording={webcamRecording} />}

          <div className="card p-4">
            <h3 className="text-sm font-semibold">Tips</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-[var(--muted)]">
              <li>Think aloud — structure beats silence.</li>
              <li>Give an example or trade-off where you can.</li>
              <li>Say what you don&apos;t know rather than guessing vaguely.</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
