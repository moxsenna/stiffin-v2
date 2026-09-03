import http from 'node:http';
import { createApp } from '../src/app';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { provisionPromotorUser } from '../src/auth/provisioning';
import { productEntitlements, programs, modules, lessons, organizations, organizationSubscriptions } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const port = Number(process.env.PORT || 8787);
const databaseUrl =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.OWNER_DATABASE_URL ||
  'postgresql://promotor_runtime:ci_runtime_pw@localhost:5432/postgres';

async function ensureSeedData() {
  try {
    const pool = new Pool({ connectionString: databaseUrl });
    const db = drizzle(pool);

    try {
      const existingOrg = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, 'rina'))
        .limit(1);

      let orgId: string | undefined = existingOrg[0]?.id;

      if (!orgId) {
        const provisioned = await provisionPromotorUser(db, {
          name: 'Rina Promotor',
          email: 'rina@stifin.id',
          password: 'password123',
          organizationName: 'STIFIn Promotor',
          organizationSlug: 'rina',
        });
        orgId = provisioned.organizationId;
      }

      const currentOrgId = orgId;
      if (currentOrgId) {
        await db
          .update(productEntitlements)
          .set({ promotorClass: true, promotorFlow: true })
          .where(eq(productEntitlements.organizationId, currentOrgId));

        const existingSub = await db
          .select()
          .from(organizationSubscriptions)
          .where(eq(organizationSubscriptions.organizationId, currentOrgId))
          .limit(1);

        if (existingSub.length === 0) {
          await db.insert(organizationSubscriptions).values({
            organizationId: currentOrgId,
            planCode: 'SOLO',
            status: 'ACTIVE',
            billingCycle: 'MONTHLY',
            provider: 'NONE',
            currentPeriodStart: new Date().toISOString(),
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          });
        }

        const existingProg = await db
          .select()
          .from(programs)
          .where(eq(programs.slug, '7-hari-mengenal-cara-belajar-anak'))
          .limit(1);

        if (existingProg.length === 0) {
          const [prog] = await db
            .insert(programs)
            .values({
              organizationId: currentOrgId,
              title: '7 Hari Mengenal Cara Belajar Anak',
              slug: '7-hari-mengenal-cara-belajar-anak',
              programType: 'lead_magnet',
              status: 'published',
              pricing: 'free',
              priceAmount: 0,
            })
            .returning();

          const [mod1] = await db
            .insert(modules)
            .values({
              programId: prog.id,
              title: 'Modul 1: Fondasi Karakter',
              order: 1,
            })
            .returning();

          await db.insert(lessons).values({
            moduleId: mod1.id,
            title: 'Hari 1: Mengenali Pola',
            order: 1,
            isRequired: true,
            textContent: 'Konten hari 1',
          });
        }
      }
    } catch (err: any) {
      console.warn('Seed data initialization note:', err?.message || err);
    } finally {
      await pool.end();
    }
  } catch (err: any) {
    console.warn('Seed pool note:', err?.message || err);
  }
}

const app = createApp();

const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host || `127.0.0.1:${port}`;
    const url = `http://${host}${req.url}`;
    const headers = new Headers();
    for (const [key, val] of Object.entries(req.headers)) {
      if (Array.isArray(val)) {
        val.forEach((v) => headers.append(key, v));
      } else if (val !== undefined) {
        headers.set(key, val);
      }
    }

    let body: Buffer | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      body = Buffer.concat(chunks);
    }

    const request = new Request(url, {
      method: req.method,
      headers,
      body: body && body.length > 0 ? (new Uint8Array(body) as unknown as BodyInit) : undefined,
    });

    const env = {
      APP_ENV: 'development',
      BETTER_AUTH_SECRET: 'dev_auth_secret_32_characters_minimum_len_12345',
      BETTER_AUTH_URL: `http://127.0.0.1:${port}`,
      BETTER_AUTH_TRUSTED_ORIGINS:
        'http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001',
      DATABASE_URL: databaseUrl,
      HYPERDRIVE: { connectionString: databaseUrl },
    };

    const response = await app.fetch(request, env as any);

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        const existing = res.getHeader('set-cookie');
        if (Array.isArray(existing)) {
          res.setHeader('set-cookie', [...existing, value]);
        } else if (existing) {
          res.setHeader('set-cookie', [String(existing), value]);
        } else {
          res.setHeader('set-cookie', value);
        }
      } else {
        res.setHeader(key, value);
      }
    });

    const respBuffer = Buffer.from(await response.arrayBuffer());
    res.end(respBuffer);
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: err?.message || String(err) } }));
  }
});

ensureSeedData().finally(() => {
  server.listen(port, '0.0.0.0', () => {
    console.log(`Platform API server listening on http://127.0.0.1:${port}`);
  });
});
