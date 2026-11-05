"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type WebcamStatus = "off" | "starting" | "live" | "denied" | "error";

/**
 * Owns the camera stream for the interview screen.
 *
 * Audio is deliberately excluded — speech recognition owns the mic, and
 * requesting it twice makes some browsers drop one of the two.
 */
export function useWebcam(enabledByDefault = true) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<WebcamStatus>(
    enabledByDefault ? "starting" : "off",
  );

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("off");
  }, []);

  const start = useCallback(async () => {
    if (streamRef.current) return;
    setStatus("starting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStatus("live");
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      setStatus(name === "NotAllowedError" ? "denied" : "error");
    }
  }, []);

  const toggle = useCallback(() => {
    if (streamRef.current) stop();
    else void start();
  }, [start, stop]);

  useEffect(() => {
    if (enabledByDefault) void start();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-attach if the element mounts after the stream arrives.
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [status]);

  return { videoRef, status, start, stop, toggle, live: status === "live" };
}
