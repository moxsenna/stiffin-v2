import { Client } from 'pg';

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const grants = await client.query(`
    SELECT table_name, privilege_type 
    FROM information_schema.role_table_grants 
    WHERE grantee = 'promotor_runtime'
    ORDER BY table_name, privilege_type;
  `);
  console.log('Grants for promotor_runtime:');
  const grouped: Record<string, string[]> = {};
  for (const row of grants.rows) {
    if (!grouped[row.table_name]) grouped[row.table_name] = [];
    grouped[row.table_name].push(row.privilege_type);
  }
  console.log(JSON.stringify(grouped, null, 2));

  await client.end();
}

main().catch(console.error);
