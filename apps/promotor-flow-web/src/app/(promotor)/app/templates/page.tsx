'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { messagingQueries } from '@/lib/container';
import { MessageTemplate } from '@promotor/promotor-flow-fixtures';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);

  useEffect(() => {
    messagingQueries.generateDraftMessage('CONTACT_LEAD', 'Test').then(async () => {
      const list = await (await import('@/adapters/mock/message-template-repository')).MockMessageTemplateRepository.prototype.listTemplates.call({
        store: (await import('@/lib/container')).store,
      });
      setTemplates(list);
    });
  }, []);

  return (
    <AppShell showBottomNav={true}>
      <div style={{ padding: '12px 16px' }}>
        <h1 style={{ font: '700 24px/29px Inter, sans-serif', color: '#191918' }}>Template Pesan WhatsApp</h1>
        <div style={{ font: '400 13.5px Inter, sans-serif', color: '#71706B', paddingTop: '4px' }}>
          Draft pesan standar untuk tindak lanjut cepat.
        </div>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E8E7E3' }}>
        {templates.map((tmpl) => (
          <div key={tmpl.id} style={{ padding: '14px 16px', borderBottom: '1px solid #E8E7E3' }}>
            <div style={{ font: '600 15px Inter, sans-serif', color: '#191918' }}>{tmpl.title}</div>
            <div style={{ font: '400 13.5px/20px Inter, sans-serif', color: '#71706B', paddingTop: '6px', whiteSpace: 'pre-wrap' }}>
              {tmpl.templateText}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
