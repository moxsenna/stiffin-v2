'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { PwaLogo } from '@/components/pwa/pwa';
import { EmptyState, ErrorState, LoadingRows } from '@/components/ui';
import { getProgramsQuery } from '@/modules/programs/queries';
import { getPublicStorefrontRepository } from '@/adapters';
import { Program } from '@promotor/contracts';

function programTypeLabel(programType: string): string {
  if (programType === 'lead_magnet') return 'Gratis · magnet peserta';
  if (programType === 'aftersales') return 'Khusus peserta tes';
  return 'Berbayar';
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[] | null>(null);
  const [workspaceSlug, setWorkspaceSlug] = useState('demo');
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = React.useCallback(async () =>{
    setLoadError(null);
    try {
      const data = await getProgramsQuery();
      if (data) setPrograms(data);
      else setPrograms([]);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Tidak dapat memuat program.');
    }
    getPublicStorefrontRepository().getStorefrontProfile().then(profile =>{
      if (profile && profile.workspaceSlug) setWorkspaceSlug(profile.workspaceSlug);
    }).catch(() =>{});
  }, []);

  useEffect(() =>{
    loadData();
  }, [loadData]);

  return (
    <PromotorShell>
      <div className="pwa-screen pwa-screen-pad-dock" style={{ minHeight: '100dvh' }}>
        <div className="promotor-top">
          <div className="promotor-brandrow">
            <PwaLogo />
            <div style={{ minWidth: 0 }}>
              <div className="promotor-brandname">Ralivo Class</div>
              <div className="promotor-brandtag">Promotor workspace · katalog program</div>
            </div>
          </div>
          <h1 className="promotor-title">Program</h1>
          <div className="promotor-sub">
            {programs ? `${programs.length} program · materi edukasi, gratis & berbayar` : 'Memuat program...'}
          </div>

          <div className="promo-stats" aria-label="Ringkasan program">
            <div className="promo-stat">
              <div className="promo-stat-num">{programs ? programs.length : '–'}</div>
              <div className="promo-stat-label">Total program</div>
            </div>
            <div className="promo-stat">
              <div className="promo-stat-num" style={{ color: 'var(--pwa-primary)' }}>
                {programs ? programs.filter((p) => p.status === 'published').length : '–'}
              </div>
              <div className="promo-stat-label">Terbit</div>
            </div>
            <div className="promo-stat">
              <div className="promo-stat-num" style={{ color: 'var(--pwa-warning)' }}>
                {programs ? programs.filter((p) => p.status !== 'published').length : '–'}
              </div>
              <div className="promo-stat-label">Draf</div>
            </div>
          </div>
        </div>

        <div className="promotor-wrap">
          <Link href="/app/programs/new" className="pwa-cta" style={{ marginTop: 4 }}>
            + Buat Program Baru
          </Link>

          {loadError && (
            <div style={{ marginTop: 12 }}>
              <ErrorState title="Gagal memuat program" detail={loadError} onRetry={() =>loadData()} />
            </div>
          )}

          {!programs && !loadError && (
            <>
              <div className="pwa-section-head">
                <h2 className="pwa-section-title">Daftar program</h2>
              </div>
              <LoadingRows rows={4} />
            </>
          )}

          {programs && programs.length === 0 && !loadError && (
            <div style={{ marginTop: 12 }} className="pwa-card pwa-card-pad">
              <EmptyState
                title="Belum ada program"
                explanation="Buat program pertama Anda untuk mulai menerima peserta di storefront."
                action={
                  <Link href="/app/programs/new" className="pwa-btn-primary">
                    + Buat Program Pertama Anda
                  </Link>
                }
              />
            </div>
          )}

          {programs && programs.length > 0 && (
            <>
              <div className="pwa-section-head">
                <h2 className="pwa-section-title">Daftar program</h2>
                <span className="pwa-muted tabular-nums" style={{ fontWeight: 800, fontSize: 12 }}>
                  {programs.length}
                </span>
              </div>
              {programs.map(prog =>{
                const published = prog.status === 'published';
                const lessonCount = prog.modules.reduce((acc, m) =>acc + m.lessons.length, 0);
                return (
                  <div key={prog.id} className="pwa-card pwa-card-pad" style={{ marginTop: 10 }}>
                    <div className="learner-namerow">
                      <span className="learner-name">{prog.title}</span>
                      <span className={published ? 'pwa-pill-green' : 'pwa-pill-amber'} style={{ flex: 'none' }}>
                        {published ? 'Terbit' : 'Draf'}
                      </span>
                    </div>

                    {(prog.subtitle || prog.description) && (
                      <div className="learner-reason" style={{ whiteSpace: 'normal' }}>
                        {prog.subtitle || prog.description}
                      </div>
                    )}

                    <div className="learner-meta" style={{ marginTop: 6 }}>
                      {programTypeLabel(prog.programType)} · {prog.modules.length} bab · {lessonCount} pelajaran
                    </div>

                    <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Link href={`/app/programs/${prog.id}`} className="pwa-btn-primary">
                        Kelola kurikulum
                      </Link>
                      <Link
                        href={`/p/${workspaceSlug}/${prog.programSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pwa-btn-soft"
                      >
                        Lihat landing ↗
                      </Link>
                    </div>
                  </div>
                );
              })}
              <div style={{ marginTop: 12 }}>
                <Link href="/app/settings" className="pwa-btn-secondary" style={{ width: '100%' }}>
                  Pengaturan Storefront
                </Link>
              </div>
            </>
          )}
          <div style={{ height: 12 }} />
        </div>
      </div>
    </PromotorShell>
 );
}
