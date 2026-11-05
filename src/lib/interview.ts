import { generateJson } from "./gemini";

/**
 * The interview engine: what to ask next, and how to grade what came back.
 *
 * Everything the AI returns is constrained by a JSON schema so the rest
 * of the app can rely on the shape instead of parsing prose.
 */

// ── domains offered to the student ───────────────────────────

export const DOMAINS = {
  dsa: "Data Structures & Algorithms",
  dbms: "Database Management Systems",
  os: "Operating Systems",
  cn: "Computer Networks",
  oops: "Object-Oriented Programming",
  webdev: "Web Development",
  aptitude: "Aptitude & Logical Reasoning",
  hr: "HR & Behavioural",
} as const;

export type DomainKey = keyof typeof DOMAINS;

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** The four axes every answer is scored on. */
export const PARAMETERS = {
  technical: "Technical accuracy",
  clarity: "Clarity of explanation",
  depth: "Depth and detail",
  communication: "Communication and structure",
} as const;

export type ParameterKey = keyof typeof PARAMETERS;
export type ParameterScores = Record<ParameterKey, number>;

// ── shared prompt preamble ───────────────────────────────────

function interviewerPersona(role: string, domain: string, difficulty: Difficulty) {
  return `You are a professional technical interviewer conducting a mock placement interview.

Context:
- Candidate is a third-year undergraduate engineering student in India preparing for campus placements.
- Target role: ${role}
- Focus area: ${domain}
- Difficulty: ${difficulty}

Behave like a real interviewer: be fair, specific, and concise. Never flatter.
Do not reveal scores or evaluation criteria to the candidate.`;
}

// ── question generation ──────────────────────────────────────

const questionSchema = {
  type: "object",
  properties: {
    question: {
      type: "string",
      description: "The interview question to ask, phrased conversationally.",
    },
    category: {
      type: "string",
      description: "Short label for what this question probes, e.g. 'Indexing'.",
    },
  },
  required: ["question", "category"],
} as const;

export type GeneratedQuestion = { question: string; category: string };

export type AskedQuestion = {
  question: string;
  answer: string | null;
  score: number | null;
};

/**
 * Produces the next question, taking the conversation so far into
 * account so the interview adapts rather than reading from a fixed list.
 */
export async function generateNextQuestion(params: {
  role: string;
  domain: string;
  difficulty: Difficulty;
  position: number;
  total: number;
  history: AskedQuestion[];
}): Promise<GeneratedQuestion> {
  const { role, domain, difficulty, position, total, history } = params;

  const transcript =
    history.length === 0
      ? "(none — this is the opening question)"
      : history
          .map(
            (h, i) =>
              `Q${i + 1}: ${h.question}\nA${i + 1}: ${
                h.answer?.trim() || "(no answer given)"
              }\nScore: ${h.score ?? "n/a"}/10`,
          )
          .join("\n\n");

  const prompt = `${interviewerPersona(role, domain, difficulty)}

Conversation so far:
${transcript}

Ask question ${position} of ${total}.

Rules:
- Do not repeat a topic already covered above.
- If the previous answer was strong (score >= 7), go deeper or raise difficulty.
- If the previous answer was weak (score <= 4), move to a different sub-topic rather than piling on.
- Question ${total} should be a closing question.
- Ask exactly one question. No preamble, no numbering, no commentary.
- Keep it under 45 words and answerable out loud in about 90 seconds.`;

  return generateJson<GeneratedQuestion>(prompt, questionSchema, {
    temperature: 0.9,
  });
}

// ── answer evaluation ────────────────────────────────────────

const evaluationSchema = {
  type: "object",
  properties: {
    score: { type: "number", description: "Overall score for this answer, 0-10." },
    parameters: {
      type: "object",
      properties: {
        technical: { type: "number" },
        clarity: { type: "number" },
        depth: { type: "number" },
        communication: { type: "number" },
      },
      required: ["technical", "clarity", "depth", "communication"],
    },
    feedback: {
      type: "string",
      description: "2-3 sentences of direct, actionable feedback addressed to the candidate as 'you'.",
    },
    idealAnswer: {
      type: "string",
      description: "A concise model answer, 3-5 sentences, showing what a strong response covers.",
    },
  },
  required: ["score", "parameters", "feedback", "idealAnswer"],
} as const;

export type Evaluation = {
  score: number;
  parameters: ParameterScores;
  feedback: string;
  idealAnswer: string;
};

export async function evaluateAnswer(params: {
  role: string;
  domain: string;
  difficulty: Difficulty;
  question: string;
  answer: string;
}): Promise<Evaluation> {
  const { role, domain, difficulty, question, answer } = params;

  const trimmed = answer.trim();

  // Don't spend a model call grading silence.
  if (trimmed.length === 0) {
    return {
      score: 0,
      parameters: { technical: 0, clarity: 0, depth: 0, communication: 0 },
      feedback:
        "You did not answer this question. In a real interview, say what you do know and think aloud rather than staying silent.",
      idealAnswer: "",
    };
  }

  const prompt = `${interviewerPersona(role, domain, difficulty)}

Evaluate the candidate's answer.

Question: ${question}

Candidate's answer:
"""
${trimmed}
"""

Scoring guidance (0-10 on each axis):
- 0-2  nothing correct, or did not engage with the question
- 3-4  partially correct with significant gaps or errors
- 5-6  broadly correct but shallow, vague, or poorly organised
- 7-8  correct, well structured, shows real understanding
- 9-10 correct, precise, with depth, trade-offs, or examples

Be strict and realistic — this is practice for a real placement interview,
and inflated scores leave the candidate unprepared. If the answer is short
or hand-wavy, say so. The transcript may come from speech recognition, so
ignore punctuation, filler words, and minor transcription errors; judge the
substance only.`;

  const result = await generateJson<Evaluation>(prompt, evaluationSchema, {
    temperature: 0.2,
  });

  return { ...result, score: clamp(result.score) };
}

// ── final report ─────────────────────────────────────────────

const reportSchema = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "A 3-4 sentence overall assessment of placement readiness, addressed to the candidate.",
    },
    strengths: {
      type: "array",
      items: { type: "string" },
      description: "2-4 specific strengths observed.",
    },
    improvements: {
      type: "array",
      items: { type: "string" },
      description: "2-4 specific, actionable areas to improve.",
    },
  },
  required: ["summary", "strengths", "improvements"],
} as const;

export type InterviewReport = {
  summary: string;
  strengths: string[];
  improvements: string[];
};

export async function generateReport(params: {
  role: string;
  domain: string;
  difficulty: Difficulty;
  overallScore: number;
  answers: Array<{ question: string; answer: string | null; score: number | null }>;
}): Promise<InterviewReport> {
  const { role, domain, difficulty, overallScore, answers } = params;

  const transcript = answers
    .map(
      (a, i) =>
        `Q${i + 1}: ${a.question}\nA${i + 1}: ${
          a.answer?.trim() || "(no answer)"
        }\nScore: ${a.score ?? 0}/10`,
    )
    .join("\n\n");

  const prompt = `${interviewerPersona(role, domain, difficulty)}

The interview is over. Here is the full transcript with per-answer scores.

${transcript}

Overall score: ${overallScore.toFixed(1)}/10

Write the candidate's performance report. Be specific — cite what they actually
said rather than offering generic advice. If the overall score is below 5, be
honest that more preparation is needed before facing real interviews.`;

  return generateJson<InterviewReport>(prompt, reportSchema, { temperature: 0.4 });
}

// ── helpers ──────────────────────────────────────────────────

export function clamp(n: number, min = 0, max = 10): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n * 10) / 10));
}

export function averageParameters(list: ParameterScores[]): ParameterScores {
  const keys = Object.keys(PARAMETERS) as ParameterKey[];
  const out = {} as ParameterScores;

  for (const key of keys) {
    const values = list.map((p) => p?.[key]).filter((v): v is number => Number.isFinite(v));
    out[key] = values.length
      ? clamp(values.reduce((a, b) => a + b, 0) / values.length)
      : 0;
  }

  return out;
}
