import { query } from "./db";
import { DOMAINS, PARAMETERS, type DomainKey, type ParameterKey } from "./interview";

/**
 * Aggregate queries behind the placement-cell dashboard.
 *
 * Every figure here is computed in Postgres rather than by loading rows
 * into Node, so the dashboard stays fast as the cohort grows.
 */

export type CohortSummary = {
  students: number;
  activeStudents: number;
  interviews: number;
  completed: number;
  averageScore: number | null;
  readyCount: number;
};

export async function getCohortSummary(): Promise<CohortSummary> {
  const [row] = await query<{
    students: string;
    active_students: string;
    interviews: string;
    completed: string;
    average_score: string | null;
    ready_count: string;
  }>(`
    WITH per_student AS (
      SELECT u.id,
             COUNT(i.id) FILTER (WHERE i.status = 'completed') AS completed,
             AVG(i.overall_score) FILTER (WHERE i.status = 'completed') AS avg_score
        FROM users u
        LEFT JOIN interviews i ON i.user_id = u.id
       WHERE u.role = 'student'
       GROUP BY u.id
    )
    SELECT
      (SELECT COUNT(*) FROM users WHERE role = 'student')                  AS students,
      (SELECT COUNT(*) FROM per_student WHERE completed > 0)               AS active_students,
      (SELECT COUNT(*) FROM interviews)                                    AS interviews,
      (SELECT COUNT(*) FROM interviews WHERE status = 'completed')         AS completed,
      (SELECT AVG(overall_score) FROM interviews WHERE status = 'completed') AS average_score,
      (SELECT COUNT(*) FROM per_student WHERE avg_score >= 7)              AS ready_count
  `);

  return {
    students: Number(row?.students ?? 0),
    activeStudents: Number(row?.active_students ?? 0),
    interviews: Number(row?.interviews ?? 0),
    completed: Number(row?.completed ?? 0),
    averageScore: row?.average_score === null ? null : Number(row?.average_score),
    readyCount: Number(row?.ready_count ?? 0),
  };
}

export type StudentRow = {
  id: string;
  name: string;
  email: string;
  branch: string | null;
  joined: Date;
  completed: number;
  averageScore: number | null;
  bestScore: number | null;
  lastActivity: Date | null;
};

export async function listStudents(search?: string): Promise<StudentRow[]> {
  const term = search?.trim();

  return (
    await query<{
      id: string;
      name: string;
      email: string;
      branch: string | null;
      created_at: Date;
      completed: string;
      avg_score: string | null;
      best_score: string | null;
      last_activity: Date | null;
    }>(
      `SELECT u.id, u.name, u.email, u.branch, u.created_at,
              COUNT(i.id) FILTER (WHERE i.status = 'completed')      AS completed,
              AVG(i.overall_score) FILTER (WHERE i.status = 'completed') AS avg_score,
              MAX(i.overall_score) FILTER (WHERE i.status = 'completed') AS best_score,
              MAX(i.created_at)                                      AS last_activity
         FROM users u
         LEFT JOIN interviews i ON i.user_id = u.id
        WHERE u.role = 'student'
          AND ($1::text IS NULL
               OR u.name ILIKE '%' || $1 || '%'
               OR u.email ILIKE '%' || $1 || '%'
               OR u.branch ILIKE '%' || $1 || '%')
        GROUP BY u.id
        ORDER BY last_activity DESC NULLS LAST, u.created_at DESC
        LIMIT 200`,
      [term && term.length > 0 ? term : null],
    )
  ).map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    branch: r.branch,
    joined: r.created_at,
    completed: Number(r.completed),
    averageScore: r.avg_score === null ? null : Number(r.avg_score),
    bestScore: r.best_score === null ? null : Number(r.best_score),
    lastActivity: r.last_activity,
  }));
}

export type DomainStat = {
  domain: DomainKey;
  label: string;
  attempts: number;
  averageScore: number;
};

/** Which subjects the cohort is weakest in — the headline insight. */
export async function getDomainBreakdown(): Promise<DomainStat[]> {
  const rows = await query<{ domain: DomainKey; attempts: string; avg_score: string }>(
    `SELECT domain, COUNT(*) AS attempts, AVG(overall_score) AS avg_score
       FROM interviews
      WHERE status = 'completed' AND overall_score IS NOT NULL
      GROUP BY domain
      ORDER BY avg_score ASC`,
  );

  return rows.map((r) => ({
    domain: r.domain,
    label: DOMAINS[r.domain] ?? r.domain,
    attempts: Number(r.attempts),
    averageScore: Number(r.avg_score),
  }));
}

/** Cohort-wide averages per scoring parameter. */
export async function getParameterAverages(): Promise<Record<ParameterKey, number>> {
  const keys = Object.keys(PARAMETERS) as ParameterKey[];

  const [row] = await query<Record<string, string | null>>(
    `SELECT ${keys
      .map((k) => `AVG((parameters->>'${k}')::numeric) AS ${k}`)
      .join(", ")}
       FROM interviews
      WHERE status = 'completed' AND parameters IS NOT NULL`,
  );

  const out = {} as Record<ParameterKey, number>;
  for (const key of keys) {
    const value = row?.[key];
    out[key] = value === null || value === undefined ? 0 : Number(value);
  }
  return out;
}
