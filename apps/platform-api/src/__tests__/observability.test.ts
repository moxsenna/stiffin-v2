import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeConnectionString,
  sanitizeForLog,
  logOperation,
  requestLoggerMiddleware,
  StructuredLogEntry,
} from '../core/observability';
import { Hono } from 'hono';

test('Observability Redaction: connection strings redact passwords in postgres and http URLs', () => {
  const pgUrl = 'postgresql://promotor_admin:MySuperSecretPass123!@ep-divine-dust.aws.neon.tech:5432/platform_db?sslmode=require';
  const sanitized = sanitizeConnectionString(pgUrl);
  assert.ok(!sanitized.includes('MySuperSecretPass123!'), 'Password must not be in sanitized connection string');
  assert.ok(sanitized.includes('postgresql://promotor_admin:[REDACTED]@ep-divine-dust.aws.neon.tech:5432/platform_db?sslmode=require'));

  const httpUrl = 'https://admin:tokenSecret999@api.example.com/webhook';
  const sanitizedHttp = sanitizeConnectionString(httpUrl);
  assert.ok(!sanitizedHttp.includes('tokenSecret999'));
  assert.ok(sanitizedHttp.includes('https://admin:[REDACTED]@api.example.com/webhook'));
});

test('Observability Redaction: deep-scrubs passwords, secrets, access tokens, and cookies', () => {
  const payload = {
    userId: 'usr_123',
    email: 'test@example.com',
    password: 'SuperSecretPassword!',
    client_secret: 'sec_abcdef123456',
    accessToken: 'lat_tok_learner_secret_jwt',
    session_token: 'sess_secret_cookie_token',
    cookie: 'session=ey1234567890; Path=/',
    headers: {
      Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      'Set-Cookie': 'auth_session=secret_token; HttpOnly',
    },
  };

  const sanitized = sanitizeForLog(payload) as any;

  assert.equal(sanitized.userId, 'usr_123');
  assert.equal(sanitized.email, 'test@example.com');
  assert.equal(sanitized.password, '[REDACTED]');
  assert.equal(sanitized.client_secret, '[REDACTED]');
  assert.equal(sanitized.accessToken, '[REDACTED]');
  assert.equal(sanitized.session_token, '[REDACTED]');
  assert.equal(sanitized.cookie, '[REDACTED]');
  assert.equal(sanitized.headers.Authorization, '[REDACTED]');
  assert.equal(sanitized.headers['Set-Cookie'], '[REDACTED]');
});

test('Observability Redaction: deep-scrubs raw reflection responses and private notes', () => {
  const learningPayload = {
    organizationId: 'org_abc',
    enrollmentId: 'enr_xyz',
    lessonId: 'les_123',
    responseText: 'Saya merasa sangat tertekan saat bekerja dan ingin konsultasi privat.',
    reflectionAnswer: 'Catatan refleksi sangat rahasia.',
    notes: 'Kontak ini memiliki riwayat medis keluarga khusus.',
    locationText: 'Alamat rumah: Jalan Melati No. 45 Jakarta Barat',
  };

  const sanitized = sanitizeForLog(learningPayload) as any;

  assert.equal(sanitized.organizationId, 'org_abc');
  assert.equal(sanitized.enrollmentId, 'enr_xyz');
  assert.equal(sanitized.lessonId, 'les_123');
  assert.equal(sanitized.responseText, '[REDACTED]');
  assert.equal(sanitized.reflectionAnswer, '[REDACTED]');
  assert.equal(sanitized.notes, '[REDACTED]');
  assert.equal(sanitized.locationText, '[REDACTED]');
});

test('Observability Logging: emits valid JSON with standard operational fields', () => {
  const capturedLogs: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => {
    capturedLogs.push(msg);
  };

  try {
    const entry: StructuredLogEntry = {
      level: 'info',
      request_id: 'req_test_uuid_123',
      operation: 'OUTBOX_DISPATCH_ITEM',
      result: 'SUCCESS',
      duration_ms: 12.34,
      organization_id: 'org_001',
      user_id: 'usr_002',
      integration_destination: 'PROMOTORFLOW',
      details: {
        outboxId: 'outbox_123',
        operationType: 'CREATE_NEXT_ACTION',
        dbUrl: 'postgres://postgres:mysecretpassword@localhost:5432/db',
      },
    };

    logOperation(entry);

    assert.equal(capturedLogs.length, 1);
    const parsed = JSON.parse(capturedLogs[0]);

    assert.equal(parsed.level, 'info');
    assert.equal(parsed.request_id, 'req_test_uuid_123');
    assert.equal(parsed.operation, 'OUTBOX_DISPATCH_ITEM');
    assert.equal(parsed.result, 'SUCCESS');
    assert.equal(parsed.duration_ms, 12.34);
    assert.equal(parsed.organization_id, 'org_001');
    assert.equal(parsed.user_id, 'usr_002');
    assert.equal(parsed.integration_destination, 'PROMOTORFLOW');
    assert.ok(!parsed.details.dbUrl.includes('mysecretpassword'));
    assert.ok(parsed.details.dbUrl.includes('[REDACTED]'));
  } finally {
    console.log = originalLog;
  }
});

test('Observability Middleware: Hono requestLoggerMiddleware captures request_id, duration_ms, and status_code', async () => {
  const capturedLogs: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => {
    capturedLogs.push(msg);
  };

  try {
    const app = new Hono();
    app.use('*', requestLoggerMiddleware());
    app.get('/test-route', (c) => c.json({ ok: true }, 200));

    const res = await app.request('/test-route', {
      headers: { 'x-request-id': 'req_custom_trace_999' },
    });

    assert.equal(res.status, 200);
    assert.ok(capturedLogs.length >= 1);

    const parsed = JSON.parse(capturedLogs[0]);
    assert.equal(parsed.request_id, 'req_custom_trace_999');
    assert.equal(parsed.operation, 'HTTP_GET_/test-route');
    assert.equal(parsed.result, 'SUCCESS');
    assert.equal(parsed.status_code, 200);
    assert.ok(typeof parsed.duration_ms === 'number');
    assert.ok(parsed.duration_ms >= 0);
  } finally {
    console.log = originalLog;
  }
});
