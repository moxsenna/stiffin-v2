import { Client } from 'pg';

async function main() {
  // Let's connect as neondb_owner first and test if promotor_runtime can SELECT on accounts
  const ownerClient = new Client({ connectionString: process.env.DATABASE_URL });
  await ownerClient.connect();

  const testPerms = await ownerClient.query(`
    SELECT 
      table_name,
      has_table_privilege('promotor_runtime', 'public.' || table_name, 'SELECT') as can_select,
      has_table_privilege('promotor_runtime', 'public.' || table_name, 'INSERT') as can_insert
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name IN ('users', 'sessions', 'accounts', 'auth_rate_limits', 'programs', 'modules', 'lessons')
    ORDER BY table_name;
  `);

  console.log('Privileges of promotor_runtime:', testPerms.rows);
  await ownerClient.end();
}

main().catch(console.error);
