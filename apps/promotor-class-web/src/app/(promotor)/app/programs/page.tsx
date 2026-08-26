'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { PageHeader, SectionHead, EmptyState, ErrorState, LoadingRows } from '@/components/ui';
import { getProgramsQuery } from '@/modules/programs/queries';
import { getPublicStorefrontRepository } from '@/adapters';
import { Program } from '@promotor/contracts';

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
     <PageHeader
        kicker="PromotorClass"
        title="Program"
        sub={programs ? `${programs.length} program · materi edukasi, gratis & berbayar` : 'Memuat program...'}
        action={
          <Link href="/app/programs/new" className="btn btn-primary btn-sm" style={{ alignSelf: 'center', whiteSpace: 'nowrap' }}>
           + Buat Program Baru
          </Link>
       }
      />

     {loadError && <ErrorState title="Gagal memuat program" detail={loadError} onRetry={() =>loadData()} />}

      {!programs && !loadError && (
        <>
         <SectionHead label="Daftar program" />
         <LoadingRows rows={4} />
       </>
     )}

      {programs && programs.length === 0 && !loadError && (
        <EmptyState
          title="Belum ada program"
          explanation="Buat program pertama Anda untuk mulai menerima peserta di storefront."
          action={
            <Link href="/app/programs/new" className="btn btn-primary btn-sm">
             + Buat Program Pertama Anda
            </Link>
         }
        />
     )}

      {programs && programs.length >0 && (
        <>
         <SectionHead label="Daftar program" count={`${programs.length}`} />
         {programs.map(prog =>(
            <div key={prog.id} style={{ padding: '15px 18px', borderBottom: '1px solid var(--line)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
               <span style={{ font: '700 15px/1.25 var(--font-sans)', letterSpacing: '-0.01em', minWidth: 0 }}>{prog.title}</span>
               <span className={`tag ${prog.status === 'published' ? 'tag-neutral' : 'tag-outline'}`} style={{ flex: 'none' }}>
                 {prog.status === 'published' ? 'Terbit di Storefront' : 'Draf'}
                </span>
             </div>

             {(prog.subtitle || prog.description) && (
                <div style={{ marginTop: 5, font: '400 12px/1.45 var(--font-sans)', color: 'var(--muted-strong)' }}>
                 {prog.subtitle || prog.description}
                </div>
             )}

              <div style={{ marginTop: 8, display: 'flex', gap: 14, flexWrap: 'wrap', font: '500 11px/1 var(--font-sans)', color: 'var(--muted)' }}>
               <span>{prog.programType === 'lead_magnet' ? 'Gratis (Lead Magnet)' : prog.programType === 'aftersales' ? 'Khusus Peserta Tes' : 'Berbayar'}</span>
               <span>{prog.modules.length} bab</span>
               <span>{prog.modules.reduce((acc, m) =>acc + m.lessons.length, 0)} pelajaran</span>
             </div>

             <div style={{ marginTop: 12, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
               <Link href={`/app/programs/${prog.id}`} className="btn btn-secondary btn-sm">
                 Kelola Kurikulum & Materi
                </Link>
               <Link href={`/p/${workspaceSlug}/${prog.programSlug}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                 Lihat Landing ↗
                </Link>
             </div>
           </div>
         ))}
          <div style={{ padding: 18 }}>
           <Link href="/app/settings" className="btn btn-secondary btn-block">Pengaturan Storefront</Link>
         </div>
       </>
     )}
      <div style={{ height: 24 }} />
   </PromotorShell>
 );
}
