'use client';

import React, { useState, useEffect } from 'react';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { MockStateStore } from '@/adapters/mock/mock-state-store';
import { LearningActivityProjection, Reflection } from '@promotor/contracts';

export default function ActivityPage() {
  const [activities, setActivities] = useState<LearningActivityProjection[]>([]);

  useEffect(() => {
    setActivities(MockStateStore.getState().reflections.map((r: Reflection, idx: number) => ({
      id: `act_${idx}`,
      contactId: 'contact_ayu',
      learnerName: idx % 2 === 0 ? 'Ayu Lestari' : 'Nina Rahmawati',
      activitySummary: r.answerText,
      timeAgoFormatted: '03:01',
      timestamp: r.createdAt,
    })));
  }, []);

  return (
    <PromotorShell>
      <div style={{ padding: '16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Log Aktivitas Belajar</h1>
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
          Timeline real-time penyelesaian modul & jawaban refleksi peserta
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {activities.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--border-radius-md)' }}>
              Belum ada aktivitas belajar terbaru.
            </div>
          ) : (
            activities.map(act => (
              <div
                key={act.id}
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--color-divider)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{act.learnerName}</div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-main)' }}>
                    Refleksi: &ldquo;{act.activitySummary}&rdquo;
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }} className="tabular-nums">
                  {act.timeAgoFormatted}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PromotorShell>
  );
}
