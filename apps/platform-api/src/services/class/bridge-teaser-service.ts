import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, count, desc, eq } from 'drizzle-orm';
import { learningSignals } from '../../db/schema/learning-signals';
import type { BridgeTeaser } from '@promotor/contracts';
import { createEntitlementRepository } from '../../repositories/entitlement-repository';
import { getDismissal } from '../integration/bridge-metrics-service';

export interface BridgeTeaserDeps {
  getForOrg(input: { organizationId: string }): Promise<{
    promotorFlow?: boolean | null;
    promotorClass?: boolean | null;
  } | null>;
  getDismissal(db: NodePgDatabase, organizationId: string, surface: string): Promise<string | null>;
}

export function createBridgeTeaserService(db: NodePgDatabase, deps?: Partial<BridgeTeaserDeps>) {
  const getForOrg =
    deps?.getForOrg ??
    ((input: { organizationId: string }) =>
      createEntitlementRepository(db).getForOrg(input) as any);
  const dismissal =
    deps?.getDismissal ??
    ((_: NodePgDatabase, orgId: string, surface: string) => getDismissal(db, orgId, surface));

  return {
    async getTeaser(organizationId: string): Promise<BridgeTeaser> {
      const ent = await getForOrg({ organizationId });
      if (ent?.promotorFlow) {
        return { available: false, signalsCount: 0, preview: null };
      }

      const [cnt] = await db
        .select({ v: count() })
        .from(learningSignals)
        .where(
          and(
            eq(learningSignals.organizationId, organizationId),
            eq(learningSignals.status, 'ACTIVE')
          )
        );

      const recent = await db
        .select()
        .from(learningSignals)
        .where(
          and(
            eq(learningSignals.organizationId, organizationId),
            eq(learningSignals.status, 'ACTIVE')
          )
        )
        .orderBy(desc(learningSignals.createdAt))
        .limit(1);

      const latest = recent[0];
      const dismissedAt = await dismissal(db, organizationId, 'beranda_flow_teaser');

      return {
        available: true,
        signalsCount: Number(cnt?.v ?? 0),
        preview: latest
          ? {
              title: `Follow-up: ${latest.recommendedActionReason ?? latest.reason ?? latest.type}`,
              dueLabel: 'Hari ini',
            }
          : null,
        dismissedAt,
      };
    },
  };
}
