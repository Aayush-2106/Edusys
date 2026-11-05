"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useWebcam } from "@/hooks/useWebcam";

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

/**
 * The interview, presented as a video call.
 *
 * The call framing is doing real work, not decoration: a student who
 * practises in something that looks like the real setting is better
 * prepared than one who fills in a web form.
 */
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
  const [showNotes, setShowNotes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const speech = useSpeechRecognition();
  const voice = useSpeechSynthesis();
  const cam = useWebcam(webcamPreview);

  const startedAtRef = useRef(Date.now());

  // Call timer.
  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Speak each new question once.
  useEffect(() => {
    voice.speak(question);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question]);

  const spoken = [speech.transcript, speech.interimTranscript]
    .filter(Boolean)
    .join(" ")
    .trim();
  const answer = [typed.trim(), spoken].filter(Boolean).join(" ").trim();
  const hasAnswer = answer.length > 0;

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
      setShowNotes(false);
      speech.reset();
      startedAtRef.current = Date.now();
    } catch {
      setError("Could not reach the server. Your answer was not saved — try again.");
    } finally {
      setSubmitting(false);
    }
  }, [answer, interviewId, router, speech, submitting, voice]);

  async function quit() {
    if (!confirm("Leave this interview? It will be marked as abandoned.")) return;
    speech.stop();
    voice.cancel();
    cam.stop();
    await fetch(`/api/interviews/${interviewId}`, { method: "DELETE" });
    router.push("/dashboard");
  }

  const isLast = position >= total;

  return (
    <div className="flex min-h-dvh flex-col bg-[#0b0e13] text-[#e9ecf1]">
      {/* ── call bar ─────────────────────────────────────── */}
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-[#ff8b84]">
          <span className="anim-dot h-1.5 w-1.5 rounded-full bg-[#e5484d]" />
          {webcamRecording ? "Recording" : "Live"}
        </span>

        <span className="t-num text-xs text-white/50">{formatTime(elapsed)}</span>

        <div className="mx-auto flex items-center gap-2">
          <span className="hidden text-xs text-white/50 sm:inline">
            {domainLabel} · {role}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="t-num text-xs font-semibold text-white/70">
            {position}/{total}
          </span>
          <div className="flex gap-1" aria-hidden>
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full transition-colors"
                style={{
                  background:
                    i < position - 1
                      ? "#3987e5"
                      : i === position - 1
                        ? "#e9ecf1"
                        : "rgba(255,255,255,0.18)",
                }}
              />
            ))}
          </div>
        </div>
      </header>

      {/* ── stage ────────────────────────────────────────── */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-3 p-3 sm:p-4">
        <div className="grid flex-1 gap-3 sm:grid-cols-[1.6fr_1fr]">
          {/* interviewer tile */}
          <div className="relative flex min-h-[220px] flex-col justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#161c26] to-[#10141b] p-6 sm:p-8">
            <div className="absolute left-4 top-4 flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#3987e5] text-xs font-bold text-white">
                AI
              </span>
              <span className="text-xs font-medium text-white/70">Interviewer</span>
              {voice.speaking && (
                <span className="flex items-end gap-0.5" aria-label="Speaking">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="anim-dot w-0.5 rounded-full bg-[#3987e5]"
                      style={{
                        height: `${6 + i * 3}px`,
                        animationDelay: `${i * 0.15}s`,
                      }}
                    />
                  ))}
                </span>
              )}
            </div>

            <div key={question} className="anim-rise">
              {category && (
                <p className="text-[0.6875rem] font-bold uppercase tracking-[0.09em] text-[#6ba5ef]">
                  {category}
                </p>
              )}
              <p className="mt-2.5 text-lg font-medium leading-snug sm:text-2xl sm:leading-snug">
                {question}
              </p>
            </div>

            {voice.supported && (
              <button
                type="button"
                onClick={() => voice.speak(question)}
                disabled={voice.speaking}
                className="absolute bottom-4 left-4 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                {voice.speaking ? "Speaking…" : "↻ Repeat"}
              </button>
            )}
          </div>

          {/* your tile */}
          <div className="relative min-h-[180px] overflow-hidden rounded-2xl border border-white/10 bg-[#10141b]">
            <video
              ref={cam.videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
              style={{
                transform: "scaleX(-1)",
                display: cam.live ? "block" : "none",
              }}
            />

            {!cam.live && (
              <div className="absolute inset-0 grid place-items-center p-4 text-center">
                <div>
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/10 text-xl font-bold">
                    {cam.status === "starting" ? "…" : "⬚"}
                  </div>
                  <p className="mt-3 text-xs text-white/50">
                    {cam.status === "starting" && "Starting camera…"}
                    {cam.status === "off" && "Camera off"}
                    {cam.status === "denied" && "Camera blocked — interview works without it"}
                    {cam.status === "error" && "No camera found"}
                  </p>
                </div>
              </div>
            )}

            <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium backdrop-blur">
              {speech.listening && (
                <span className="anim-dot h-1.5 w-1.5 rounded-full bg-[#e5484d]" />
              )}
              You
            </span>
          </div>
        </div>

        {/* ── live transcript ───────────────────────────── */}
        {(speech.listening || spoken) && (
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[0.6875rem] font-bold uppercase tracking-[0.09em] text-white/40">
                {speech.listening ? "Listening" : "Your answer"}
              </span>
              {spoken && (
                <button
                  type="button"
                  onClick={speech.reset}
                  className="text-xs font-semibold text-white/40 transition hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="max-h-28 overflow-y-auto text-sm leading-relaxed">
              {speech.transcript}
              {speech.interimTranscript && (
                <span className="text-white/45"> {speech.interimTranscript}</span>
              )}
              {!spoken && (
                <span className="text-white/35">
                  Start speaking — your words will appear here.
                </span>
              )}
            </p>
          </div>
        )}

        {/* ── typed notes ───────────────────────────────── */}
        {showNotes && (
          <div className="anim-rise rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <textarea
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              rows={4}
              autoFocus
              disabled={submitting}
              placeholder="Type your answer, or add to what you said."
              className="w-full resize-y rounded-lg border border-white/10 bg-[#0b0e13] px-3 py-2.5 text-sm text-[#e9ecf1] placeholder:text-white/30 focus:border-[#3987e5] focus:outline-none"
            />
          </div>
        )}

        {speech.error && (
          <p className="rounded-lg bg-[#fab219]/10 px-3 py-2 text-sm text-[#fcd34d]">
            {speech.error}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-[#e5484d]/10 px-3 py-2 text-sm text-[#ff8b84]"
          >
            {error}
          </p>
        )}
      </main>

      {/* ── control bar ──────────────────────────────────── */}
      <footer className="sticky bottom-0 border-t border-white/10 bg-[#0b0e13]/95 px-3 py-3 backdrop-blur sm:px-4">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-2 sm:justify-between">
          <div className="flex items-center gap-2">
            <CallButton
              onClick={speech.listening ? speech.stop : speech.start}
              active={speech.listening}
              disabled={submitting || !speech.supported}
              danger={speech.listening}
              label={
                !speech.supported
                  ? "Voice needs Chrome or Edge"
                  : speech.listening
                    ? "Stop speaking"
                    : "Answer by voice"
              }
            >
              {speech.listening ? "◼" : "🎤"}
            </CallButton>

            <CallButton
              onClick={cam.toggle}
              active={cam.live}
              disabled={submitting || cam.status === "denied"}
              label={cam.live ? "Turn camera off" : "Turn camera on"}
            >
              {cam.live ? "📷" : "⊘"}
            </CallButton>

            <CallButton
              onClick={() => setShowNotes((v) => !v)}
              active={showNotes}
              disabled={submitting}
              label={showNotes ? "Hide typing" : "Type instead"}
            >
              ⌨
            </CallButton>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={quit}
              disabled={submitting}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              Leave
            </button>

            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="btn btn-primary min-w-[172px]"
            >
              {submitting ? (
                <>
                  <span className="anim-dot h-1.5 w-1.5 rounded-full bg-current" />
                  Evaluating answer…
                </>
              ) : isLast ? (
                "Finish & see report"
              ) : hasAnswer ? (
                "Submit & continue"
              ) : (
                "Skip question"
              )}
            </button>
          </div>
        </div>

        {submitting && (
          <p className="mt-2 text-center text-xs text-white/40">
            The interviewer is reading your answer and writing the next question. This
            takes up to a minute.
          </p>
        )}
      </footer>
    </div>
  );
}

function CallButton({
  children,
  onClick,
  label,
  active,
  danger,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className="grid h-11 w-11 place-items-center rounded-full border text-base transition disabled:cursor-not-allowed disabled:opacity-35"
      style={{
        background: danger
          ? "#e5484d"
          : active
            ? "rgba(255,255,255,0.14)"
            : "transparent",
        borderColor: danger ? "#e5484d" : "rgba(255,255,255,0.16)",
      }}
    >
      {children}
    </button>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
