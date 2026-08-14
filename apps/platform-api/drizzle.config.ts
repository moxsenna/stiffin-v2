import { defineConfig } from 'drizzle-kit';

// Migration tooling ONLY. DATABASE_URL here is read by drizzle-kit / migration
// scripts running as the neondb_owner role. The Worker runtime never reads it.
export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
});
