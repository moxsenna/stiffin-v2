'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, SectionHead, EmptyState, LoadingRows } from '@/components/ui';
import { messagingQueries } from '@/lib/container';
import { MessageTemplate } from '@promotor/promotor-flow-fixtures';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[] | null>(null);

  useEffect(() =>{
    messagingQueries
      .listTemplates()
      .then(setTemplates)
      .catch(() =>setTemplates([]));
  }, []);

  return (
    <AppShell showBottomNav={true}>
     <PageHeader kicker="PromotorFlow" title="Template Pesan WhatsApp" sub="Draft pesan standar untuk tindak lanjut cepat." />

     {!templates && <LoadingRows rows={3} />}

      {templates && templates.length >0 && (
        <>
         <SectionHead label="Template" count={`${templates.length}`} />
         {templates.map((tmpl) =>(
            <div key={tmpl.id} style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
             <div style={{ font: '700 15px/1.25 var(--font-sans)' }}>{tmpl.title}</div>
             <div style={{ marginTop: 6, borderLeft: '2px solid var(--ink)', paddingLeft: 12, font: '400 13px/1.55 var(--font-sans)', color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
               {tmpl.templateText}
              </div>
           </div>
         ))}
        </>
     )}

      {templates && templates.length === 0 && (
        <EmptyState title="Belum ada template" explanation="Template pesan membantu tindak lanjut yang konsisten." />
     )}
      <div style={{ height: 24 }} />
   </AppShell>
 );
}
