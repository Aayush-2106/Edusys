/**
 * Centralised environment access.
 *
 * Every value the app needs is read here once, so a missing variable
 * fails loudly at startup instead of as a confusing `undefined` deep
 * inside a request handler.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing environment variable ${name}. ` +
        `Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : fallback;
}

export const env = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get geminiApiKey() {
    return required("GEMINI_API_KEY");
  },
  get geminiModel() {
    return optional("GEMINI_MODEL", "gemini-3.8-flash");
  },
  get geminiFallbackModel() {
    return optional("GEMINI_MODEL_FALLBACK", "gemini-3.5-flash-lite");
  },
  get authSecret() {
    return required("AUTH_SECRET");
  },
  get questionCount() {
    const n = Number.parseInt(optional("INTERVIEW_QUESTION_COUNT", "8"), 10);
    return Number.isFinite(n) && n > 0 && n <= 20 ? n : 8;
  },
};

/** Client-safe flags. Must be referenced as full literals so Next can inline them. */
export const clientFlags = {
  webcamPreview: process.env.NEXT_PUBLIC_WEBCAM_PREVIEW !== "false",
  webcamRecording: process.env.NEXT_PUBLIC_WEBCAM_RECORDING === "true",
};
