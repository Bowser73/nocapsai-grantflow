/**
 * GrantFlow AI — Apply pending schema changes at deploy time
 *
 * Runs as part of `npm run build`, so a deployment can never go live against a
 * database that is missing the columns the new code needs.
 *
 * Why not `prisma migrate deploy`? This database was built partly with
 * `prisma db push`, so Prisma's migration history does not match what is
 * actually in the database, and `migrate deploy` would try to re-run an early
 * migration and fail. Instead, each file listed below is written to be
 * idempotent — every statement is guarded with IF [NOT] EXISTS or a WHERE
 * clause — so applying it is safe whether or not it has run before, and safe to
 * run on every deploy.
 *
 * Nothing here drops or rewrites existing data: the files only add columns,
 * tables and indexes, and set the plan of accounts that predate billing.
 *
 * If the database cannot be reached, this exits non-zero and the build fails,
 * which leaves the previous deployment serving rather than publishing code that
 * would error at runtime.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

/** Applied in order. Each must be idempotent. */
const MIGRATIONS = [
  "20261111000000_storage_reminders_billing",
  "20261111000001_foundations",
];

/** Splits a migration file into statements, ignoring `--` comments.
 *  The files deliberately contain no dollar-quoted blocks or string literals
 *  with semicolons, which keeps this split safe. */
export function statementsIn(sql: string): string[] {
  const withoutComments = sql
    .split("\n")
    .map((line) => {
      const i = line.indexOf("--");
      return i === -1 ? line : line.slice(0, i);
    })
    .join("\n");

  if (withoutComments.includes("$$")) {
    throw new Error("Dollar-quoted blocks are not supported by this splitter.");
  }

  return withoutComments
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "[deploy-migrate] DATABASE_URL is not set. Refusing to build: the app would " +
        "deploy against a database whose schema has not been checked."
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    for (const name of MIGRATIONS) {
      const file = path.join(process.cwd(), "prisma", "migrations", name, "migration.sql");
      const statements = statementsIn(readFileSync(file, "utf8"));
      for (const statement of statements) {
        await prisma.$executeRawUnsafe(statement);
      }
      console.log(`[deploy-migrate] applied ${name} (${statements.length} statements)`);
      await record(prisma, name);
    }
    console.log("[deploy-migrate] database is up to date");
  } finally {
    await prisma.$disconnect();
  }
}

/** Notes the migration in Prisma's own history, when that table exists, so
 *  `prisma migrate status` does not report these as pending. Never fatal. */
async function record(prisma: PrismaClient, name: string) {
  try {
    await prisma.$executeRawUnsafe(
      // The id column is 36 characters, so a hash of the name is used rather
      // than the name itself.
      `INSERT INTO "_prisma_migrations"
         ("id", "checksum", "migration_name", "started_at", "finished_at", "applied_steps_count")
       SELECT md5($1), '', $1, now(), now(), 1
       WHERE NOT EXISTS (
         SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = $1
       )`,
      name
    );
  } catch {
    // No _prisma_migrations table, or a different shape: the schema change
    // itself has already been applied, which is what matters.
  }
}

main().catch((err) => {
  console.error("[deploy-migrate] failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
