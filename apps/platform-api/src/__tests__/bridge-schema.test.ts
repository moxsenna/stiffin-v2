import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { bridgeMetrics } from '../db/schema/bridge-metrics';
import { bridgeDismissals } from '../db/schema/bridge-dismissals';
import { recordBridgeMetric } from '../services/integration/bridge-metrics-service';

describe('bridge schema + metrics service', () => {
  it('bridge_metrics punya kolom kunci', () => {
    const cols = Object.keys(bridgeMetrics);
    for (const c of ['organizationId', 'event', 'meta', 'createdAt']) {
      assert.ok(cols.includes(c), `kolom ${c} hilang`);
    }
  });

  it('bridge_dismissals PK org+surface', () => {
    const cols = Object.keys(bridgeDismissals);
    for (const c of ['organizationId', 'surface', 'dismissedAt']) {
      assert.ok(cols.includes(c), `kolom ${c} hilang`);
    }
  });

  it('recordBridgeMetric insert event allowlisted dan menolak lainnya', async () => {
    const inserted: any[] = [];
    const fakeDb = {
      insert: () => ({
        values: (v: any) => {
          inserted.push(v);
          return {};
        },
      }),
    } as any;

    await recordBridgeMetric(fakeDb, { organizationId: 'o-1', event: 'teaser_viewed', meta: { surface: 'beranda' } });
    await assert.rejects(
      () => recordBridgeMetric(fakeDb, { organizationId: 'o-1', event: 'HACK', meta: {} }),
      /allowlist/i
    );
    assert.equal(inserted.length, 1);
    assert.equal(inserted[0].event, 'teaser_viewed');
  });
});
