/**
 * Promotes an existing account to placement-cell admin.
 *
 *   npm run make-admin -- someone@atharvacoe.ac.in
 *   npm run make-admin -- someone@atharvacoe.ac.in --revoke
 *
 * Deliberately a command-line operation rather than a UI toggle: there
 * is no path through the running app by which a student can grant
 * themselves access to other students' data.
 */
import { Client } from "pg";

async function main() {
  const args = process.argv.slice(2);
  const revoke = args.includes("--revoke");
  const email = args.find((a) => !a.startsWith("--"))?.trim().toLowerCase();

  if (!email) {
    console.error("Usage: npm run make-admin -- <email> [--revoke]");
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Check .env.local.");
    process.exit(1);
  }

  const role = revoke ? "student" : "admin";
  const client = new Client({ connectionString: url });
  await client.connect();

  const { rows } = await client.query<{ name: string; email: string; role: string }>(
    `UPDATE users SET role = $1 WHERE lower(email) = $2
     RETURNING name, email, role`,
    [role, email],
  );

  await client.end();

  if (rows.length === 0) {
    console.error(`No account found for ${email}. Register it first, then re-run this.`);
    process.exit(1);
  }

  console.log(`${rows[0].name} <${rows[0].email}> is now a ${rows[0].role}.`);
  if (!revoke) console.log("They must sign out and back in for the change to show.");
}

main().catch((error) => {
  console.error("Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
