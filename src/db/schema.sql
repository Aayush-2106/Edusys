-- Edusys schema.
-- Idempotent: safe to run repeatedly (`npm run db:migrate`).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Users
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  college       TEXT,
  branch        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email lookups happen on every login; make them case-insensitive and indexed.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));

-- Roles. Everyone registers as a student; placement-cell staff are promoted
-- deliberately with `npm run make-admin <email>` — never through the UI.
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'student';

-- ─────────────────────────────────────────────────────────────
-- Interviews
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE interview_status AS ENUM ('in_progress', 'completed', 'abandoned');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS interviews (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- What the student chose before starting.
  role           TEXT NOT NULL,              -- e.g. "Software Engineer"
  domain         TEXT NOT NULL,              -- e.g. "dsa", "dbms", "hr"
  difficulty     TEXT NOT NULL,              -- "easy" | "medium" | "hard"
  question_count INT  NOT NULL,

  status         interview_status NOT NULL DEFAULT 'in_progress',

  -- Filled in when the interview is completed.
  overall_score  NUMERIC(4,1),               -- 0.0 – 10.0
  summary        TEXT,
  strengths      TEXT[],
  improvements   TEXT[],
  -- Per-parameter averages, e.g. {"technical": 7.5, "clarity": 6.0, ...}
  parameters     JSONB,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS interviews_user_created_idx
  ON interviews (user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- Questions (one row per question asked within an interview)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interview_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id  UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,

  position      INT  NOT NULL,               -- 1-based order within the interview
  question      TEXT NOT NULL,
  category      TEXT,                        -- what this question probes
  asked_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- The student's response.
  answer        TEXT,
  answered_at   TIMESTAMPTZ,
  -- How the answer was given, for the report: 'text' | 'voice'
  answer_mode   TEXT,
  -- Seconds the student took to answer; useful signal for the report.
  duration_secs INT,

  -- Evaluation of this single answer.
  score         NUMERIC(4,1),                -- 0.0 – 10.0
  feedback      TEXT,
  ideal_answer  TEXT,
  parameters    JSONB,

  UNIQUE (interview_id, position)
);

CREATE INDEX IF NOT EXISTS interview_questions_interview_idx
  ON interview_questions (interview_id, position);
