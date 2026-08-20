import http from 'node:http';
import { createApp } from '../src/app';

const port = Number(process.env.PORT || 8787);
const databaseUrl =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.OWNER_DATABASE_URL ||
  'postgresql://promotor_runtime:ci_runtime_pw@localhost:5432/postgres';

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

server.listen(port, '0.0.0.0', () => {
  console.log(`Platform API server listening on http://127.0.0.1:${port}`);
});
