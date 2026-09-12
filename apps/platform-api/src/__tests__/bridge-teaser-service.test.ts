import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createBridgeTeaserService } from '../services/class/bridge-teaser-service';

function fakeDb(rows: { signals?: any[]; recent?: any[] }) {
  const makeAwaitable = (result: any[]) => {
    const arr: any = [...result];
    arr.limit = async () => [...result];
    arr.orderBy = () => makeAwaitable(result);
    return arr;
  };
  return {
    select: () => ({
      from: () => ({
        where: () => makeAwaitable(rows.signals ?? []),
      }),
    }),
  } as any;
}

const deps = {
  getForOrg: async () => ({ promotorFlow: false, promotorClass: true }) as any,
  getDismissal: async () => null as string | null,
};

describe('bridge teaser service', () => {
  it('available=false ketika org sudah punya Flow', async () => {
    const svc = createBridgeTeaserService(fakeDb({}), {
      getForOrg: async () => ({ promotorFlow: true, promotorClass: true }) as any,
      getDismissal: async () => null,
    });
    const t = await svc.getTeaser('org-1');
    assert.equal(t.available, false);
    assert.equal(t.signalsCount, 0);
    assert.equal(t.preview, null);
  });

  it('menghitung sinyal aktif + preview terbaru saat belum punya Flow', async () => {
    const svc = createBridgeTeaserService(
      fakeDb({
        signals: [{ v: 3 }],
        recent: [
          {
            id: 's1',
            type: 'INACTIVITY',
            reason: 'PROGRAM_COMPLETED',
            recommendedActionReason: 'Program selesai — jadwalkan aftercare',
            createdAt: new Date().toISOString(),
          },
        ],
      }),
      deps
    );
    const t = await svc.getTeaser('org-1');
    assert.equal(t.available, true);
    assert.equal(t.signalsCount, 3);
    assert.ok(t.preview);
    assert.ok(t.preview!.title.length > 0);
    assert.equal(t.preview!.dueLabel, 'Hari ini');
  });

  it('membawa dismissedAt dari bridge_dismissals', async () => {
    const svc = createBridgeTeaserService(fakeDb({ signals: [{ v: 1 }], recent: [] }), {
      getForOrg: async () => ({ promotorFlow: false, promotorClass: true }) as any,
      getDismissal: async () => '2026-09-12T00:00:00.000Z',
    });
    const t = await svc.getTeaser('org-1');
    assert.equal(t.dismissedAt, '2026-09-12T00:00:00.000Z');
  });
});
