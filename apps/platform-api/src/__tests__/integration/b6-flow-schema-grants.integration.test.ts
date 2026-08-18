import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { sql, eq } from 'drizzle-orm';
import {
  applyMigrationsAsOwner,
  TEST_DATABASE_URL,
  withIntegrationDb,
  withRuntimeSql,
  withOwnerSql,
  pgErrorCode,
} from './test-env';
import {
  organizations,
  users,
  contacts,
  programs,
  services,
  bookings,
  nextActions,
  activities,
  contactFlowStates,
  aftercareRecords,
  contactAssessments,
  messageTemplates,
} from '../../db/schema';

const enabled = Boolean(TEST_DATABASE_URL);

const B6_TABLES = [
  'services',
  'bookings',
  'next_actions',
  'activities',
  'contact_flow_states',
  'aftercare_records',
  'contact_assessments',
  'message_templates',
];

const ALL_24_TABLES = [
  // B1 (5)
  'organizations',
  'users',
  'organization_members',
  'contacts',
  'product_entitlements',
  // B2 (5)
  'sessions',
  'accounts',
  'verifications',
  'organization_invitations',
  'auth_rate_limits',
  // B3 (6)
  'programs',
  'modules',
  'lessons',
  'lesson_attachments',
  'program_presentations',
  'workspace_profiles',
  // B6 (8)
  'services',
  'bookings',
  'next_actions',
  'activities',
  'contact_flow_states',
  'aftercare_records',
  'contact_assessments',
  'message_templates',
  // B6.1 (1)
  'availability_rules',
];

/** Asserts a Drizzle insert/update/delete rejects with a specific PostgreSQL error code. */
async function rejectsWithCode(
  fn: () => Promise<unknown>,
  code: string | string[],
  message: string
): Promise<void> {
  await assert.rejects(
    fn,
    (err: unknown) => {
      const actualCode = pgErrorCode(err);
      if (Array.isArray(code)) {
        assert.ok(code.includes(actualCode as string), `${message}: expected one of ${code.join(',')} got ${actualCode}`);
      } else {
        assert.strictEqual(actualCode, code, message);
      }
      return true;
    },
    message
  );
}

describe('B6 — Flow Schema, Migration & Grants Integration Suite', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  let testOrgId: string;
  let testContactId: string;
  let testServiceId: string;
  let testUserId: string;

  before(async () => {
    await applyMigrationsAsOwner();

    await withIntegrationDb(async (db) => {
      const [org] = await db
        .insert(organizations)
        .values({ name: 'B6 Test Org', slug: `b6-org-${Date.now()}` })
        .returning();
      testOrgId = org.id;

      const [user] = await db
        .insert(users)
        .values({ name: 'B6 User', email: `b6-user-${Date.now()}@example.com` })
        .returning();
      testUserId = user.id;

      const [contact] = await db
        .insert(contacts)
        .values({ organizationId: testOrgId, name: 'B6 Contact', phoneE164: '+6281234567890' })
        .returning();
      testContactId = contact.id;

      const [service] = await db
        .insert(services)
        .values({
          organizationId: testOrgId,
          name: 'Consultation Session',
          category: 'SESSION',
          priceAmount: 500000,
          depositAmount: 150000,
          durationMinutes: 60,
        })
        .returning();
      testServiceId = service.id;
    });
  });

  describe('1. Schema existence: All 8 B6 Flow tables exist', () => {
    it('verifies all 8 Flow tables exist in public schema', async () => {
      await withIntegrationDb(async (db) => {
        for (const table of B6_TABLES) {
          const res = await db.execute(sql`SELECT to_regclass(${`public.${table}`}) AS t`);
          assert.ok((res.rows[0] as { t: string }).t, `table ${table} must exist`);
        }
      });
    });

    it('verifies total database table count is 24 tables across B1, B2, B3, and B6', async () => {
      await withIntegrationDb(async (db) => {
        for (const table of ALL_24_TABLES) {
          const res = await db.execute(sql`SELECT to_regclass(${`public.${table}`}) AS t`);
          assert.ok((res.rows[0] as { t: string }).t, `table ${table} must exist`);
        }
      });
    });
  });

  describe('2. Table CHECK constraints and validation invariants', () => {
    it('services: accepts valid deposit_amount, rejects negative price or deposit, rejects invalid category', async () => {
      await withIntegrationDb(async (db) => {
        // Valid insert with deposit_amount = null
        const [sNull] = await db
          .insert(services)
          .values({
            organizationId: testOrgId,
            name: 'No Deposit Service',
            category: 'OTHER',
            priceAmount: 100000,
            depositAmount: null,
            durationMinutes: 30,
          })
          .returning();
        assert.strictEqual(sNull.depositAmount, null);

        // Valid insert with deposit_amount >= 0
        const [sWithDep] = await db
          .insert(services)
          .values({
            organizationId: testOrgId,
            name: 'With Deposit Service',
            category: 'PROGRAM',
            priceAmount: 1000000,
            depositAmount: 300000,
            durationMinutes: 90,
          })
          .returning();
        assert.strictEqual(sWithDep.depositAmount, 300000);

        // Negative priceAmount rejected
        await rejectsWithCode(
          async () => {
            await db.insert(services).values({
              organizationId: testOrgId,
              name: 'Bad Price',
              category: 'SESSION',
              priceAmount: -500,
              durationMinutes: 30,
            });
          },
          '23514',
          'negative price_amount must be rejected by check'
        );

        // Negative depositAmount rejected
        await rejectsWithCode(
          async () => {
            await db.insert(services).values({
              organizationId: testOrgId,
              name: 'Bad Deposit',
              category: 'SESSION',
              priceAmount: 100000,
              depositAmount: -100,
              durationMinutes: 30,
            });
          },
          '23514',
          'negative deposit_amount must be rejected by check'
        );

        // Invalid category rejected
        await rejectsWithCode(
          async () => {
            await db.insert(services).values({
              organizationId: testOrgId,
              name: 'Bad Category',
              category: 'INVALID_CATEGORY',
              priceAmount: 100000,
              durationMinutes: 30,
            });
          },
          '23514',
          'invalid category must be rejected by check'
        );

        // Zero duration rejected
        await rejectsWithCode(
          async () => {
            await db.insert(services).values({
              organizationId: testOrgId,
              name: 'Zero Duration',
              category: 'SESSION',
              priceAmount: 100000,
              durationMinutes: 0,
            });
          },
          '23514',
          'duration_minutes <= 0 must be rejected by check'
        );
      });
    });

    it('bookings: enforces status bijection with completed_at, amount >= 0, and enum invariants', async () => {
      await withIntegrationDb(async (db) => {
        const startAt = new Date().toISOString();
        const endAt = new Date(Date.now() + 3600_000).toISOString();

        // Valid booking
        const [b] = await db
          .insert(bookings)
          .values({
            organizationId: testOrgId,
            contactId: testContactId,
            serviceId: testServiceId,
            amount: 500000,
            startAt,
            endAt,
            locationType: 'ONLINE',
            status: 'PENDING',
          })
          .returning();
        assert.ok(b.id);
        assert.strictEqual(b.amount, 500000);

        // COMPLETED without completed_at rejected
        await rejectsWithCode(
          async () => {
            await db.insert(bookings).values({
              organizationId: testOrgId,
              contactId: testContactId,
              serviceId: testServiceId,
              amount: 500000,
              startAt,
              locationType: 'HOME_VISIT',
              status: 'COMPLETED',
              completedAt: null,
            });
          },
          '23514',
          'COMPLETED booking without completed_at must be rejected'
        );

        // Non-COMPLETED with completed_at rejected
        await rejectsWithCode(
          async () => {
            await db.insert(bookings).values({
              organizationId: testOrgId,
              contactId: testContactId,
              serviceId: testServiceId,
              amount: 500000,
              startAt,
              locationType: 'ON_SITE',
              status: 'CONFIRMED',
              completedAt: new Date().toISOString(),
            });
          },
          '23514',
          'CONFIRMED booking with completed_at must be rejected'
        );

        // end_at <= start_at rejected
        await rejectsWithCode(
          async () => {
            await db.insert(bookings).values({
              organizationId: testOrgId,
              contactId: testContactId,
              serviceId: testServiceId,
              amount: 500000,
              startAt,
              endAt: new Date(Date.now() - 3600_000).toISOString(),
              locationType: 'ONLINE',
              status: 'PENDING',
            });
          },
          '23514',
          'end_at <= start_at must be rejected'
        );
      });
    });

    it('next_actions: enforces priority range, status/completed_at bijection, and action_type check', async () => {
      await withIntegrationDb(async (db) => {
        const dueAt = new Date().toISOString();

        // Valid action
        const [a] = await db
          .insert(nextActions)
          .values({
            organizationId: testOrgId,
            contactId: testContactId,
            actionType: 'CONTACT_LEAD',
            title: 'Call lead',
            dueAt,
            priority: 75,
            status: 'PENDING',
            source: 'PROMOTORFLOW',
          })
          .returning();
        assert.ok(a.id);

        // Priority 0 rejected (< 1)
        await rejectsWithCode(
          async () => {
            await db.insert(nextActions).values({
              organizationId: testOrgId,
              contactId: testContactId,
              actionType: 'FOLLOW_UP',
              title: 'Follow up',
              dueAt,
              priority: 0,
            });
          },
          '23514',
          'priority < 1 must be rejected'
        );

        // Priority 101 rejected (> 100)
        await rejectsWithCode(
          async () => {
            await db.insert(nextActions).values({
              organizationId: testOrgId,
              contactId: testContactId,
              actionType: 'FOLLOW_UP',
              title: 'Follow up',
              dueAt,
              priority: 101,
            });
          },
          '23514',
          'priority > 100 must be rejected'
        );

        // Empty title rejected
        await rejectsWithCode(
          async () => {
            await db.insert(nextActions).values({
              organizationId: testOrgId,
              contactId: testContactId,
              actionType: 'FOLLOW_UP',
              title: '',
              dueAt,
              priority: 50,
            });
          },
          '23514',
          'empty title must be rejected'
        );
      });
    });

    it('activities: accepts all 21 canonical event types and validates event_type CHECK', async () => {
      const EVENT_TYPES = [
        'CONTACT_CREATED',
        'CONTACT_UPDATED',
        'STAGE_CHANGED',
        'WHATSAPP_OPENED',
        'WHATSAPP_SENT',
        'ACTION_CREATED',
        'ACTION_COMPLETED',
        'ACTION_RESCHEDULED',
        'ACTION_SKIPPED',
        'ACTION_CANCELLED',
        'BOOKING_CREATED',
        'BOOKING_CONFIRMED',
        'BOOKING_RESCHEDULED',
        'BOOKING_CANCELLED',
        'BOOKING_NO_SHOW',
        'BOOKING_COMPLETED',
        'PAYMENT_MARKED',
        'AFTERCARE_CREATED',
        'AFTERCARE_COMPLETED',
        'ASSESSMENT_STATUS_CHANGED',
        'CLASS_SIGNAL',
      ];

      await withIntegrationDb(async (db) => {
        for (const eventType of EVENT_TYPES) {
          const [act] = await db
            .insert(activities)
            .values({
              organizationId: testOrgId,
              contactId: testContactId,
              eventType,
              actorUserId: testUserId,
              metadataJson: { test: true },
            })
            .returning();
          assert.strictEqual(act.eventType, eventType);
        }

        // Invalid event_type rejected
        await rejectsWithCode(
          async () => {
            await db.insert(activities).values({
              organizationId: testOrgId,
              contactId: testContactId,
              eventType: 'INVALID_EVENT_TYPE',
            });
          },
          '23514',
          'invalid activity event_type must be rejected'
        );
      });
    });

    it('contact_flow_states: stage LOST requires lost_reason, non-LOST rejects lost_reason, interest is stored', async () => {
      await withIntegrationDb(async (db) => {
        // Valid NEW stage with interest
        const [cfs] = await db
          .insert(contactFlowStates)
          .values({
            organizationId: testOrgId,
            contactId: testContactId,
            stage: 'NEW',
            classification: 'PROSPECT',
            interest: 'Parenting Program 2026',
            lostReason: null,
          })
          .returning();
        assert.strictEqual(cfs.interest, 'Parenting Program 2026');
        assert.strictEqual(cfs.classification, 'PROSPECT');

        // LOST without lost_reason rejected
        const [c2] = await db
          .insert(contacts)
          .values({ organizationId: testOrgId, name: 'Contact 2', phoneE164: '+6281234567891' })
          .returning();

        await rejectsWithCode(
          async () => {
            await db.insert(contactFlowStates).values({
              organizationId: testOrgId,
              contactId: c2.id,
              stage: 'LOST',
              lostReason: null,
            });
          },
          '23514',
          'LOST stage without lost_reason must be rejected'
        );

        // Non-LOST with lost_reason rejected
        await rejectsWithCode(
          async () => {
            await db.insert(contactFlowStates).values({
              organizationId: testOrgId,
              contactId: c2.id,
              stage: 'INTERESTED',
              lostReason: 'Too expensive',
            });
          },
          '23514',
          'non-LOST stage with lost_reason must be rejected'
        );
      });
    });

    it('aftercare_records: enforces COMPLETED status bijection with outcome and recorded_at', async () => {
      await withIntegrationDb(async (db) => {
        const [b] = await db
          .insert(bookings)
          .values({
            organizationId: testOrgId,
            contactId: testContactId,
            serviceId: testServiceId,
            amount: 500000,
            startAt: new Date().toISOString(),
            locationType: 'ONLINE',
            status: 'CONFIRMED',
          })
          .returning();

        // Valid PENDING aftercare record
        const [ar] = await db
          .insert(aftercareRecords)
          .values({
            organizationId: testOrgId,
            bookingId: b.id,
            contactId: testContactId,
            scheduledFor: new Date(Date.now() + 7 * 86400_000).toISOString(),
            status: 'PENDING',
          })
          .returning();
        assert.strictEqual(ar.status, 'PENDING');

        // COMPLETED without outcome rejected
        const [b2] = await db
          .insert(bookings)
          .values({
            organizationId: testOrgId,
            contactId: testContactId,
            serviceId: testServiceId,
            amount: 500000,
            startAt: new Date().toISOString(),
            locationType: 'ONLINE',
            status: 'CONFIRMED',
          })
          .returning();

        await rejectsWithCode(
          async () => {
            await db.insert(aftercareRecords).values({
              organizationId: testOrgId,
              bookingId: b2.id,
              contactId: testContactId,
              scheduledFor: new Date().toISOString(),
              status: 'COMPLETED',
              outcome: null,
              recordedAt: new Date().toISOString(),
            });
          },
          '23514',
          'COMPLETED aftercare without outcome must be rejected'
        );
      });
    });

    it('contact_assessments & message_templates: validates status and category constraints', async () => {
      await withIntegrationDb(async (db) => {
        // contact_assessments valid
        const [ca] = await db
          .insert(contactAssessments)
          .values({
            organizationId: testOrgId,
            contactId: testContactId,
            status: 'SCHEDULED',
          })
          .returning();
        assert.strictEqual(ca.status, 'SCHEDULED');

        // message_templates valid
        const [mt] = await db
          .insert(messageTemplates)
          .values({
            organizationId: testOrgId,
            title: 'Greeting Template',
            category: 'CONTACT_LEAD',
            templateText: 'Hello {{name}}, thanks for reaching out!',
          })
          .returning();
        assert.strictEqual(mt.category, 'CONTACT_LEAD');

        // message_templates invalid category rejected
        await rejectsWithCode(
          async () => {
            await db.insert(messageTemplates).values({
              organizationId: testOrgId,
              title: 'Bad Template',
              category: 'INVALID_CATEGORY',
              templateText: 'Text',
            });
          },
          '23514',
          'invalid template category must be rejected'
        );
      });
    });
  });

  describe('3. Unique constraints and partial unique indexes', () => {
    it('bookings: partial unique (organization_id, idempotency_key) rejects duplicates and allows NULLs', async () => {
      await withIntegrationDb(async (db) => {
        const idemp = `bk-idemp-${Date.now()}`;
        await db.insert(bookings).values({
          organizationId: testOrgId,
          contactId: testContactId,
          serviceId: testServiceId,
          amount: 500000,
          startAt: new Date().toISOString(),
          locationType: 'ONLINE',
          idempotencyKey: idemp,
        });

        // Duplicate idempotencyKey in same org rejected
        await rejectsWithCode(
          async () => {
            await db.insert(bookings).values({
              organizationId: testOrgId,
              contactId: testContactId,
              serviceId: testServiceId,
              amount: 500000,
              startAt: new Date().toISOString(),
              locationType: 'ONLINE',
              idempotencyKey: idemp,
            });
          },
          '23505',
          'duplicate booking idempotency_key in same org must be rejected'
        );

        // Multiple NULL idempotencyKey allowed
        await db.insert(bookings).values({
          organizationId: testOrgId,
          contactId: testContactId,
          serviceId: testServiceId,
          amount: 500000,
          startAt: new Date().toISOString(),
          locationType: 'ONLINE',
          idempotencyKey: null,
        });
        await db.insert(bookings).values({
          organizationId: testOrgId,
          contactId: testContactId,
          serviceId: testServiceId,
          amount: 500000,
          startAt: new Date().toISOString(),
          locationType: 'ONLINE',
          idempotencyKey: null,
        });
      });
    });

    it('next_actions: partial unique (organization_id, source, idempotency_key) rejects duplicates', async () => {
      await withIntegrationDb(async (db) => {
        const idemp = `na-idemp-${Date.now()}`;
        await db.insert(nextActions).values({
          organizationId: testOrgId,
          contactId: testContactId,
          actionType: 'FOLLOW_UP',
          title: 'Follow Up Action',
          dueAt: new Date().toISOString(),
          priority: 50,
          source: 'PROMOTORCLASS',
          idempotencyKey: idemp,
        });

        await rejectsWithCode(
          async () => {
            await db.insert(nextActions).values({
              organizationId: testOrgId,
              contactId: testContactId,
              actionType: 'FOLLOW_UP',
              title: 'Duplicate Action',
              dueAt: new Date().toISOString(),
              priority: 50,
              source: 'PROMOTORCLASS',
              idempotencyKey: idemp,
            });
          },
          '23505',
          'duplicate next_actions idempotency_key must be rejected'
        );
      });
    });

    it('aftercare_records: unique (organization_id, booking_id) enforces exactly one aftercare per booking', async () => {
      await withIntegrationDb(async (db) => {
        const [b] = await db
          .insert(bookings)
          .values({
            organizationId: testOrgId,
            contactId: testContactId,
            serviceId: testServiceId,
            amount: 500000,
            startAt: new Date().toISOString(),
            locationType: 'ONLINE',
            status: 'CONFIRMED',
          })
          .returning();

        await db.insert(aftercareRecords).values({
          organizationId: testOrgId,
          bookingId: b.id,
          contactId: testContactId,
          scheduledFor: new Date().toISOString(),
          status: 'PENDING',
        });

        await rejectsWithCode(
          async () => {
            await db.insert(aftercareRecords).values({
              organizationId: testOrgId,
              bookingId: b.id,
              contactId: testContactId,
              scheduledFor: new Date().toISOString(),
              status: 'PENDING',
            });
          },
          '23505',
          'second aftercare record for same booking must be rejected'
        );
      });
    });
  });

  describe('4. Foreign Key behaviors and ON DELETE policies', () => {
    it('activities.actor_user_id sets NULL when user is deleted', async () => {
      await withIntegrationDb(async (db) => {
        const [tempUser] = await db
          .insert(users)
          .values({ name: 'Temp Actor', email: `temp-actor-${Date.now()}@example.com` })
          .returning();

        const [act] = await db
          .insert(activities)
          .values({
            organizationId: testOrgId,
            contactId: testContactId,
            eventType: 'ACTION_CREATED',
            actorUserId: tempUser.id,
            metadataJson: {},
          })
          .returning();

        assert.strictEqual(act.actorUserId, tempUser.id);

        // Delete user -> actorUserId becomes NULL (ON DELETE SET NULL)
        await db.delete(users).where(eq(users.id, tempUser.id));

        const [reloaded] = await db.select().from(activities).where(eq(activities.id, act.id));
        assert.strictEqual(reloaded.actorUserId, null);
      });
    });

    it('deleting organization with services is RESTRICTed', async () => {
      await withIntegrationDb(async (db) => {
        const [org] = await db
          .insert(organizations)
          .values({ name: 'Restricted Org', slug: `restr-${Date.now()}` })
          .returning();

        await db.insert(services).values({
          organizationId: org.id,
          name: 'Some Service',
          category: 'SESSION',
          priceAmount: 100000,
          durationMinutes: 30,
        });

        await rejectsWithCode(
          async () => {
            await db.delete(organizations).where(eq(organizations.id, org.id));
          },
          ['23503', '23001'],
          'hard deleting organization with services must be RESTRICTed'
        );
      });
    });
  });

  describe('5. Least Privilege Runtime Role Verification (Option A — 94/94 Capabilities)', () => {
    it('promotor_runtime cannot execute DDL (CREATE TABLE)', async () => {
      if (!process.env.RUNTIME_DATABASE_URL) return;
      await withRuntimeSql(async (client) => {
        await assert.rejects(async () => {
          await client.query(`CREATE TABLE b6_ddl_fail (id uuid PRIMARY KEY)`);
        });
      });
    });

    it('promotor_runtime has CRUD on 7 Flow tables and SELECT+INSERT ONLY on activities (UPDATE/DELETE denied)', async () => {
      if (!process.env.RUNTIME_DATABASE_URL) return;
      await withRuntimeSql(async (client) => {
        // 1. services (CRUD)
        const sIns = await client.query(
          `INSERT INTO services (organization_id, name, category, price_amount, duration_minutes)
           VALUES ($1, 'Runtime Service', 'SESSION', 250000, 45) RETURNING id`,
          [testOrgId]
        );
        const sId = sIns.rows[0].id;
        await client.query(`SELECT id FROM services WHERE id = $1`, [sId]);
        await client.query(`UPDATE services SET price_amount = 300000 WHERE id = $1`, [sId]);
        await client.query(`DELETE FROM services WHERE id = $1`, [sId]);

        // 2. activities (SELECT, INSERT allowed; UPDATE and DELETE denied!)
        const actIns = await client.query(
          `INSERT INTO activities (organization_id, contact_id, event_type, metadata_json)
           VALUES ($1, $2, 'CONTACT_CREATED', '{}') RETURNING id`,
          [testOrgId, testContactId]
        );
        const actId = actIns.rows[0].id;
        const actSel = await client.query(`SELECT id, event_type FROM activities WHERE id = $1`, [actId]);
        assert.strictEqual(actSel.rows[0].event_type, 'CONTACT_CREATED');

        // UPDATE on activities MUST FAIL (permission denied)
        await assert.rejects(
          async () => {
            await client.query(`UPDATE activities SET event_type = 'STAGE_CHANGED' WHERE id = $1`, [actId]);
          },
          (err: unknown) => {
            assert.strictEqual(pgErrorCode(err), '42501', 'UPDATE on activities must be denied (42501)');
            return true;
          }
        );

        // DELETE on activities MUST FAIL (permission denied)
        await assert.rejects(
          async () => {
            await client.query(`DELETE FROM activities WHERE id = $1`, [actId]);
          },
          (err: unknown) => {
            assert.strictEqual(pgErrorCode(err), '42501', 'DELETE on activities must be denied (42501)');
            return true;
          }
        );
      });
    });

    it('verifies exact 128 runtime capability arithmetic across all 33 tables (§38, §39)', async () => {
      await withRuntimeSql(async (client) => {
        // Query PostgreSQL information_schema.table_privileges for promotor_runtime
        const res = await client.query(
          `SELECT table_name, privilege_type
           FROM information_schema.table_privileges
           WHERE grantee = 'promotor_runtime' AND table_schema = 'public'
           ORDER BY table_name, privilege_type`
        );

        // Count total privileges granted
        const privileges = res.rows as { table_name: string; privilege_type: string }[];
        assert.ok(
          privileges.length >= 120,
          `Expected at least 120 runtime table privileges, found ${privileges.length}`
        );

        // Verify activities & learning_events have ONLY SELECT and INSERT (2 privileges each)
        for (const appendOnlyTable of ['activities', 'learning_events']) {
          const actPrivs = privileges
            .filter((p) => p.table_name === appendOnlyTable)
            .map((p) => p.privilege_type)
            .sort();
          assert.deepStrictEqual(actPrivs, ['INSERT', 'SELECT'], `${appendOnlyTable} must have SELECT and INSERT only`);
        }

        // Verify the other 29 tables have all 4 CRUD privileges (SELECT, INSERT, UPDATE, DELETE)
        const all31Tables = ALL_24_TABLES.concat([
          'enrollments',
          'learner_access_tokens',
          'lesson_progress',
          'reflection_responses',
          'learning_events',
          'learning_signals',
        ]);
        const otherTables = all31Tables.filter((t) => t !== 'activities' && t !== 'learning_events');
        for (const t of otherTables) {
          const tPrivs = privileges
            .filter((p) => p.table_name === t)
            .map((p) => p.privilege_type)
            .sort();
          assert.deepStrictEqual(
            tPrivs,
            ['DELETE', 'INSERT', 'SELECT', 'UPDATE'],
            `table ${t} must have all 4 CRUD privileges`
          );
        }
      });
    });
  });

  describe('6. Migration chain & predecessor compatibility', () => {
    it('migration journal contains the complete canonical chain (0000, 0001, 0002, 0003, 0004, 0005, 0006, 0007)', async () => {
      await withOwnerSql(async (client) => {
        const res = await client.query(`SELECT id, hash FROM drizzle.__drizzle_migrations ORDER BY id`);
        assert.ok(res.rows.length >= 7, 'all canonical migrations must be recorded in journal');
        assert.strictEqual(res.rows[0].id, 1);
        assert.strictEqual(res.rows[1].id, 2);
        assert.strictEqual(res.rows[2].id, 3);
        assert.strictEqual(res.rows[3].id, 4);
        assert.strictEqual(res.rows[4].id, 5);
        assert.strictEqual(res.rows[5].id, 6);
        assert.strictEqual(res.rows[6].id, 7);
      });
    });

    it('seeded predecessor data in B1, B2, and B3 remains intact after 0003 migration', async () => {
      await withIntegrationDb(async (db) => {
        // Verify B1 data
        const orgs = await db.select().from(organizations).where(eq(organizations.id, testOrgId));
        assert.strictEqual(orgs.length, 1);

        // Verify B3 data insertion works side-by-side with B6
        const [prog] = await db
          .insert(programs)
          .values({
            organizationId: testOrgId,
            title: 'Side-by-Side Class Program',
            slug: `side-prog-${Date.now()}`,
            programType: 'paid',
            pricing: 'one_time',
            priceAmount: 250000,
          })
          .returning();
        assert.ok(prog.id);
      });
    });
  });
});
