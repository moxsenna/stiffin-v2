import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  OrganizationPlanAccessSchema,
  BridgeTeaserSchema,
  JourneyItemSchema,
  JourneyResponseSchema,
  BridgeMetricEventSchema,
} from '@promotor/contracts';

describe('Bridge contracts', () => {
  it('plan access has optional features flags', () => {
    const shape = (OrganizationPlanAccessSchema as any).shape;
    assert.ok(shape.features, 'features harus ada di schema');
    const parsed = shape.features.safeParse({ promotorClass: true, promotorFlow: false });
    assert.equal(parsed.success, true);
  });

  it('bridge teaser parses', () => {
    const parsed = BridgeTeaserSchema.safeParse({
      available: true,
      signalsCount: 3,
      preview: { title: 'Follow-up Inaktivitas: Program X', dueLabel: 'Hari ini' },
      dismissedAt: null,
    });
    assert.equal(parsed.success, true);
    const noPreview = BridgeTeaserSchema.safeParse({ available: false, signalsCount: 0, preview: null });
    assert.equal(noPreview.success, true);
  });

  it('bridge metric event allowlist', () => {
    assert.equal(BridgeMetricEventSchema.safeParse('teaser_viewed').success, true);
    assert.equal(BridgeMetricEventSchema.safeParse('journey_cross_view').success, true);
    assert.equal(BridgeMetricEventSchema.safeParse('HACK').success, false);
  });

  it('journey item requires app + occurredAt', () => {
    const ok = JourneyItemSchema.safeParse({
      app: 'CLASS', type: 'payment', title: 'Lunas Rp 199.000', detail: null, occurredAt: '2026-09-12T00:00:00Z',
    });
    const bad = JourneyItemSchema.safeParse({ app: 'GITHUB', type: 'x', title: 'y', occurredAt: '2026-09-12T00:00:00Z' });
    assert.equal(ok.success, true);
    assert.equal(bad.success, false);
  });

  it('journey response parses', () => {
    const parsed = JourneyResponseSchema.safeParse({ items: [] });
    assert.equal(parsed.success, true);
  });
});
