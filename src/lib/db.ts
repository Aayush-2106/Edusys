import { Pool, type QueryResultRow } from "pg";
import { env } from "./env";

/**
 * A single shared connection pool.
 *
 * Next.js hot-reloads modules in development, which would otherwise
 * create a new pool on every edit and exhaust Neon's connection limit.
 * Stashing the pool on `globalThis` keeps exactly one alive.
 */
const globalForDb = globalThis as unknown as { __edusysPool?: Pool };

export const pool =
  globalForDb.__edusysPool ??
  new Pool({
    connectionString: env.databaseUrl,
    // Neon's pooled endpoint terminates idle connections; keep the pool small.
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__edusysPool = pool;
}

/** Run a query and return the rows, typed. */
export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

/** Run a query expected to return at most one row. */
export async function queryOne<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
