import { Client } from 'pg';

async function main() {
  const connStr = process.env.DATABASE_URL;
  if (!connStr) {
    console.error('DATABASE_URL is not set!');
    process.exit(1);
  }
  const client = new Client({ connectionString: connStr });
  await client.connect();

  const progs = await client.query('SELECT id, organization_id, title, slug, status FROM programs');
  console.log('Programs count:', progs.rowCount);
  console.log('Programs:', progs.rows);

  const profiles = await client.query('SELECT workspace_slug, display_name FROM workspace_profiles');
  console.log('Workspace profiles count:', profiles.rowCount);
  console.log('Workspace profiles:', profiles.rows);

  const contacts = await client.query('SELECT id, name, phone_e164 FROM contacts LIMIT 10');
  console.log('Contacts count:', contacts.rowCount);
  console.log('Contacts:', contacts.rows);

  const enrollments = await client.query('SELECT id, contact_id, program_id, status FROM enrollments LIMIT 10');
  console.log('Enrollments count:', enrollments.rowCount);
  console.log('Enrollments:', enrollments.rows);

  await client.end();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
