import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { join } from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';

/**
 * Migration tooling (owner authority — neondb_owner).
 * Applies Drizzle migrations from ./src/db/migrations to the target database.
 *
 * This file is TOOLING ONLY. It is never imported by the Worker runtime
 * (wrangler main is src/index.ts) and never runs inside Cloudflare Workers.
 */

/**
 * Fail-closed migration preflight.
 *
 * Drizzle hashes the RAW BYTES it reads from each migration file. Git's
 * canonical fingerprint is the LF-normalized content; a CRLF working tree
 * would produce a non-canonical hash and poison the journal. To keep:
 *
 *   raw bytes used by Drizzle migration == canonical Git LF bytes
 *
 * this guard REFUSES (before any DB access) any migration SQL file that
 * contains CRLF or lone CR bytes. It also refuses meta/*.json journal files
 * with CRLF (journal hashes are computed from the same raw bytes). We do NOT
 * silently normalize: Drizzle hashes whatever bytes it reads.
 *
 * Returns the list of offending files (empty = safe to proceed).
 */
export function migrationEolViolations(migrationsDir: string): string[] {
  const violations: string[] = [];
  for (const entry of readdirSync(migrationsDir)) {
    if (!entry.endsWith('.sql')) continue;
    const bytes = readFileSync(join(migrationsDir, entry));
    if (bytes.includes(0x0d)) {
      violations.push(entry);
    }
  }
  const metaDir = join(migrationsDir, 'meta');
  for (const entry of readdirSync(metaDir)) {
    if (!entry.endsWith('.json')) continue;
    const bytes = readFileSync(join(metaDir, entry));
    if (bytes.includes(0x0d)) {
      violations.push(`meta/${entry}`);
    }
  }
  return violations;
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('[B1 migrate] DATABASE_URL is required. Run with owner-role credentials.');
    process.exitCode = 1;
    return;
  }

  const migrationsDir = join(process.cwd(), 'src', 'db', 'migrations');
  const violations = migrationEolViolations(migrationsDir);
  if (violations.length > 0) {
    // Refuse BEFORE any DB connection/mutation. The journal would record
    // non-canonical hashes and poison the release.
    console.error(
      `[B1 migrate] REFUSED: migration files are not canonical LF (found CR bytes): ${violations.join(', ')}`
    );
    console.error('[B1 migrate] Renormalize with: git add --renormalize <files> (after .gitattributes eol=lf is in place).');
    process.exitCode = 1;
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();
  try {
    await migrate(drizzle(client), {
      migrationsFolder: migrationsDir,
    });
    console.log('[B1 migrate] migrations applied successfully');
  } finally {
    await client.end();
  }
}

void main();
