/**
 * Applies src/db/schema.sql to the database in DATABASE_URL.
 *
 *   npm run db:migrate
 *
 * The schema is written to be idempotent, so this is safe to re-run
 * and safe for every team member to run against their own database.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Check .env.local.");
    process.exit(1);
  }

  const sql = readFileSync(join(process.cwd(), "src/db/schema.sql"), "utf8");
  const client = new Client({ connectionString: url });

  await client.connect();
  console.log("Connected. Applying schema…");

  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }

  const { rows } = await client.query<{ table_name: string }>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1",
  );
  console.log("Done. Tables:", rows.map((r) => r.table_name).join(", "));

  await client.end();
}

main().catch((error) => {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
