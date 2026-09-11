import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const grantFiles = [
    'grants_b1.sql',
    'grants_b2.sql',
    'grants_b3.sql',
    'grants_b4.sql',
    'grants_b5.sql',
    'grants_b6.sql',
    'grants_b6.1.sql',
    'grants_v01.sql',
    'grants_billing.sql',
    'grants_fase2.sql',
  ];

  const docsDir = join(process.cwd(), '../../docs/sql');

  for (const file of grantFiles) {
    console.log(`Applying ${file}...`);
    const sql = readFileSync(join(docsDir, file), 'utf-8');
    await client.query(sql);
    console.log(`✓ Applied ${file}`);
  }

  // Also apply grants for Fase 3 tables
  console.log('Applying Fase 3 table grants...');
  await client.query(`
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.program_price_variants TO promotor_runtime;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.promo_coupons TO promotor_runtime;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.learner_lesson_notes TO promotor_runtime;
  `);
  console.log('✓ Applied Fase 3 table grants');

  await client.end();
}

main().catch((err) => {
  console.error('Grant application failed:', err);
  process.exit(1);
});
