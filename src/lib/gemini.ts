import { env } from "./env";

/**
 * Minimal Gemini REST client.
 *
 * Written against the raw API rather than the SDK so the request shape
 * is visible and easy to explain in the project report — and so the
 * failover below is under our control.
 *
 * Google's free tier returns 503 ("high demand") at peak hours on the
 * flagship flash model. A mock interview that dies halfway through is
 * worse than one answered by a smaller model, so every call retries
 * and then falls back to GEMINI_MODEL_FALLBACK.
 */

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { code: number; message: string; status: string };
};

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

type GenerateOptions = {
  /** Steers tone and role. Sent as Gemini's systemInstruction. */
  system?: string;
  /** 0 = deterministic, 1 = creative. Scoring uses a low value. */
  temperature?: number;
  /** When set, Gemini is constrained to emit JSON matching this schema. */
  jsonSchema?: Record<string, unknown>;
};

async function callModel(
  model: string,
  prompt: string,
  options: GenerateOptions,
): Promise<string> {
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      ...(options.jsonSchema
        ? {
            responseMimeType: "application/json",
            responseSchema: options.jsonSchema,
          }
        : {}),
    },
  };

  if (options.system) {
    body.systemInstruction = { parts: [{ text: options.system }] };
  }

  const response = await fetch(`${API_BASE}/${model}:generateContent`, {
    method: "POST",
    headers: {
      "x-goog-api-key": env.geminiApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    // Don't let a hung upstream hold a request open forever.
    signal: AbortSignal.timeout(45_000),
  });

  const json = (await response.json()) as GeminiResponse;

  if (!response.ok || json.error) {
    throw new GeminiError(
      json.error?.message ?? `Gemini returned ${response.status}`,
      response.status,
    );
  }

  const text = json.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new GeminiError("Gemini returned an empty response");
  }

  return text;
}

/** Status codes worth trying again — transient, not our fault. */
function isTransient(error: unknown): boolean {
  if (error instanceof GeminiError) {
    return error.status === 429 || error.status === 500 || error.status === 503;
  }
  // Network blips and AbortSignal timeouts.
  return true;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Generates text, retrying the primary model twice before dropping to
 * the fallback model. Throws only if everything fails.
 */
export async function generate(
  prompt: string,
  options: GenerateOptions = {},
): Promise<string> {
  const models = [env.geminiModel, env.geminiFallbackModel];
  let lastError: unknown;

  for (const model of models) {
    const attempts = model === env.geminiModel ? 3 : 2;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await callModel(model, prompt, options);
      } catch (error) {
        lastError = error;

        // A 404 means the model is gone for this key — no point retrying it.
        if (error instanceof GeminiError && error.status === 404) break;
        if (!isTransient(error)) throw error;

        if (attempt < attempts) {
          await sleep(400 * 2 ** (attempt - 1)); // 400ms, 800ms
        }
      }
    }
  }

  throw new GeminiError(
    `All Gemini models failed. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

/** Generates and parses JSON, constrained by a response schema. */
export async function generateJson<T>(
  prompt: string,
  jsonSchema: Record<string, unknown>,
  options: Omit<GenerateOptions, "jsonSchema"> = {},
): Promise<T> {
  const raw = await generate(prompt, { ...options, jsonSchema });

  try {
    return JSON.parse(raw) as T;
  } catch {
    // Some models wrap JSON in a ```json fence despite the mime type.
    const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]) as T;
    throw new GeminiError(`Could not parse JSON from model: ${raw.slice(0, 200)}`);
  }
}
