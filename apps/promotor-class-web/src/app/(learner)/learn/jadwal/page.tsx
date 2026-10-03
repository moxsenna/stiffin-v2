'use client';

import React, { useEffect, useState } from 'react';
import { PwaAppHeader, PwaDock } from '@/components/pwa/pwa';
import { EmptyStateCard, SkeletonCard } from '@/components/pwa/EmptyStateFeedback';
import { resolveWorkspaceSlug } from '@/lib/session';
import { getPlatformApiClient } from '@/adapters';
import type { LearnerScheduleItem } from '@promotor/contracts';

export default function JadwalPage() {
  const [slug, setSlug] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<LearnerScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSlug(resolveWorkspaceSlug());
    const api = getPlatformApiClient();
    api.getLearnerSchedules()
      .then((res) => {
        setSchedules(res.schedules || []);
      })
      .catch(() => {
        setSchedules([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="pwa-screen">
      <PwaAppHeader title="Jadwal Live" subtitle="COHORT & MENTORING" showCart={false} workspaceSlug={slug ?? undefined} />
      <main className="pwa-wrap pwa-screen-pad-dock">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            <SkeletonCard lines={2} hasThumbnail />
            <SkeletonCard lines={2} hasThumbnail />
          </div>
        ) : schedules.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {schedules.map((item) => (
              <div key={item.id} className="pwa-card pwa-card-pad">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="pwa-pill pwa-pill-blue">{item.locationType}</span>
                  <span className="pwa-muted" style={{ fontSize: 12 }}>
                    {new Date(item.startAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                <strong style={{ fontSize: 15, display: 'block', marginTop: 8 }}>{item.title}</strong>
                <p className="pwa-muted" style={{ fontSize: 12.5, margin: '4px 0 0' }}>{item.programTitle}</p>
                {item.locationUrl && (
                  <a
                    href={item.locationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="pwa-cta"
                    style={{ marginTop: 10, textDecoration: 'none', display: 'inline-flex', padding: '8px 16px' }}
                  >
                    Gabung Sesi Live
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>
            <EmptyStateCard
              icon="📅"
              title="Belum Ada Jadwal Live Terdekat"
              description="Info sesi live tutoring & mentoring akan diumumkan melalui WhatsApp komunitas dan muncul otomatis di kalender ini."
            />
          </div>
        )}
      </main>
      <PwaDock workspaceSlug={slug ?? undefined} />
    </div>
  );
}
