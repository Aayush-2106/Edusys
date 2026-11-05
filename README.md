# Edusys

AI-powered mock interview and placement readiness platform.

Group 38 · Department of Computer Engineering · Atharva College of Engineering

| | |
|---|---|
| **Guide** | Ruchika Katyayani |
| **Team** | Aayush Singh, Harsh Singh, Arnav Tripathy, Aayush Vedante |

---

## What it does

### For students

A student picks a target role, a focus area (DSA, DBMS, OS, CN, OOP, Web, Aptitude,
HR) and a difficulty. The AI interviewer then asks questions one at a time, reading
each aloud and transcribing the student's spoken reply, with a webcam preview to
simulate the real setting. Each answer is scored out of 10 across four parameters —
technical accuracy, clarity, depth, and communication — with written feedback and a
model answer. At the end the student gets an overall score, a readiness summary,
strengths, and areas to improve, all stored so progress can be tracked over time.

Questions are **adaptive**: the next one is generated from the transcript so far,
going deeper after a strong answer and changing sub-topic after a weak one.

### For the placement cell

Staff accounts see a cohort dashboard at `/admin`: how many students have registered
versus actually practised, the cohort average, how many are scoring 7+, which
subjects the cohort is weakest in, and a searchable table of every student. Opening
a student shows their score trend over time, skill breakdown, and full interview
history.

Promotion to staff is a command-line operation, never a UI toggle:

```bash
npm run make-admin -- officer@atharvacoe.ac.in
npm run make-admin -- officer@atharvacoe.ac.in --revoke
```

The account must already exist. Roles are read from the database on every request
rather than from the session cookie, so a revoke takes effect immediately instead of
whenever the cookie happens to expire.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL (Neon serverless) via `pg` |
| AI | Google Gemini REST API (`gemini-3.8-flash`) |
| Auth | Email + password, bcrypt hashing, signed JWT session cookie (`jose`) |
| Speech | Web Speech API — recognition and synthesis, browser-native, no cost |

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run db:migrate           # creates the tables
npm run dev                  # http://localhost:3000
```

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `GEMINI_API_KEY` | yes | Free key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | no | Defaults to `gemini-3.8-flash` |
| `GEMINI_MODEL_FALLBACK` | no | Used when the primary model is rate-limited |
| `DATABASE_URL` | yes | Postgres connection string |
| `AUTH_SECRET` | yes | Random string used to sign session cookies |
| `INTERVIEW_QUESTION_COUNT` | no | Default questions per interview (8) |
| `NEXT_PUBLIC_WEBCAM_PREVIEW` | no | Show the camera during the interview |
| `NEXT_PUBLIC_WEBCAM_RECORDING` | no | Store the video (needs blob storage) |

> `.env.local` holds secrets and is git-ignored. Never commit a real key —
> `.env.example` is the file that gets committed, and it must stay empty.

## Project layout

```
src/
├── app/
│   ├── page.tsx                      landing page
│   ├── login/ · register/            authentication
│   ├── dashboard/                    history and score stats
│   ├── interview/new/                interview setup
│   ├── interview/[id]/               the live interview
│   ├── report/[id]/                  performance report
│   ├── admin/                        placement-cell cohort dashboard
│   └── admin/students/[id]/          one student's progress
│   └── api/
│       ├── auth/{register,login,logout}/
│       └── interviews/
│           ├── route.ts              POST create · GET list
│           └── [id]/
│               ├── route.ts          GET detail · DELETE abandon
│               └── answer/route.ts   submit answer, grade, next question
├── components/                       UI components
├── hooks/                            speech recognition and synthesis
├── lib/
│   ├── env.ts        validated environment access
│   ├── db.ts         pooled Postgres client
│   ├── auth.ts       password hashing and sessions
│   ├── gemini.ts     Gemini client with retry and model failover
│   ├── interview.ts  prompts, JSON schemas, scoring logic
│   └── api.ts        route error handling
└── db/
    ├── schema.sql    tables (idempotent)
    └── migrate.ts    applies the schema
```

## Database schema

- **`users`** — name, email (unique, case-insensitive), bcrypt password hash, branch,
  and `role` (`student` | `admin`).
- **`interviews`** — role, domain, difficulty, status, overall score, summary,
  strengths, improvements, per-parameter averages.
- **`interview_questions`** — one row per question: text, the answer, how it was
  given, time taken, score, feedback, and a model answer.

## Notes on reliability

Gemini's free tier returns `503` on the flagship model at peak hours. Every call
retries three times with backoff and then falls back to a lighter model, because an
interview that dies halfway through is worse than one graded by a smaller model.

Speech recognition only exists in Chrome and Edge. The UI detects this and falls
back to typing rather than breaking. The webcam is optional in the same way — if
the student blocks it, the interview still runs.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run db:migrate` | Apply `src/db/schema.sql` |
| `npm run make-admin -- <email>` | Promote an account to placement-cell staff |
| `npm run lint` | ESLint |
