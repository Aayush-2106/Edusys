"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Speech-to-text using the browser's Web Speech API.
 *
 * Free and offline-capable in Chrome/Edge, which is why we use it
 * instead of a paid transcription service. Firefox does not implement
 * it, so `supported` must always be checked and a typed fallback kept.
 */

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<
    ArrayLike<{ transcript: string }> & { isFinal: boolean }
  >;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition(lang = "en-IN") {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Tracks whether the user wants to keep listening, so we can restart
  // after the browser's automatic ~60s cutoff.
  const wantListeningRef = useRef(false);

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("Speech recognition is not supported in this browser. Use Chrome or Edge, or type your answer.");
      return;
    }

    setError(null);
    wantListeningRef.current = true;

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interim = "";
      let appended = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) appended += text;
        else interim += text;
      }

      if (appended) {
        setFinalTranscript((prev) => (prev ? `${prev} ${appended.trim()}` : appended.trim()));
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      if (event.error === "not-allowed") {
        setError("Microphone access was blocked. Allow it in your browser's address bar, or type your answer.");
        wantListeningRef.current = false;
        setListening(false);
        return;
      }
      setError(`Microphone error: ${event.error}`);
    };

    recognition.onend = () => {
      // Chrome stops on its own after a pause; restart if still wanted.
      if (wantListeningRef.current) {
        try {
          recognition.start();
        } catch {
          setListening(false);
        }
      } else {
        setListening(false);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setListening(true);
    } catch {
      setError("Could not start the microphone.");
      setListening(false);
    }
  }, [lang]);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
    setInterimTranscript("");
  }, []);

  const reset = useCallback(() => {
    setFinalTranscript("");
    setInterimTranscript("");
    setError(null);
  }, []);

  // Make sure the mic is released if the component unmounts mid-answer.
  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  return {
    supported,
    listening,
    transcript: finalTranscript,
    interimTranscript,
    error,
    start,
    stop,
    reset,
    setTranscript: setFinalTranscript,
  };
}
