import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq } from 'drizzle-orm';
import { bridgeMetrics } from '../../db/schema/bridge-metrics';
import { bridgeDismissals } from '../../db/schema/bridge-dismissals';

const ALLOWED = new Set([
  'teaser_viewed',
  'teaser_cta_clicked',
  'upgrade_started',
  'upgrade_completed',
  'bridge_action_executed',
  'journey_cross_view',
]);

export async function recordBridgeMetric(
  db: NodePgDatabase,
  input: { organizationId: string; event: string; meta?: Record<string, unknown> }
): Promise<void> {
  if (!ALLOWED.has(input.event)) {
    throw new Error(`bridge metric event tidak ada di allowlist: ${input.event}`);
  }
  await db.insert(bridgeMetrics).values({
    organizationId: input.organizationId,
    event: input.event,
    meta: input.meta ?? {},
  });
}

export async function getDismissal(db: NodePgDatabase, organizationId: string, surface: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(bridgeDismissals)
    .where(and(eq(bridgeDismissals.organizationId, organizationId), eq(bridgeDismissals.surface, surface)))
    .limit(1);
  return row?.dismissedAt?.toISOString() ?? null;
}

export async function upsertDismissal(db: NodePgDatabase, organizationId: string, surface: string): Promise<void> {
  await db
    .insert(bridgeDismissals)
    .values({ organizationId, surface, dismissedAt: new Date() })
    .onConflictDoUpdate({
      target: [bridgeDismissals.organizationId, bridgeDismissals.surface],
      set: { dismissedAt: new Date() },
    });
}
