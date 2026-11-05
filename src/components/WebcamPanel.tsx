"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Live webcam preview shown beside the interview.
 *
 * Preview only by default — the stream never leaves the browser and
 * nothing is uploaded. Recording is behind NEXT_PUBLIC_WEBCAM_RECORDING
 * because storing video needs blob storage we haven't wired up.
 */
export function WebcamPanel({ recording = false }: { recording?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"idle" | "live" | "denied" | "error">("idle");

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 480, height: 360, facingMode: "user" },
          audio: false, // the mic is owned by speech recognition
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStatus("live");
      } catch (error) {
        if (cancelled) return;
        const name = error instanceof Error ? error.name : "";
        setStatus(name === "NotAllowedError" ? "denied" : "error");
      }
    }

    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="card overflow-hidden">
      <div className="relative aspect-[4/3] bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
        />

        {status === "live" && recording && (
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white">
            <span className="recording-dot inline-block h-2 w-2 rounded-full bg-red-500" />
            REC
          </span>
        )}

        {status !== "live" && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white/70">
            {status === "idle" && "Starting camera…"}
            {status === "denied" &&
              "Camera blocked. That's fine — the interview works without it."}
            {status === "error" && "No camera found. The interview works without it."}
          </div>
        )}
      </div>

      <p className="px-3 py-2 text-xs text-[var(--muted)]">
        {recording
          ? "Recording for your review."
          : "Preview only — this video is not recorded or uploaded."}
      </p>
    </div>
  );
}
