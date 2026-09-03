'use client';

import React, { useState, useEffect } from 'react';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { PageHeader, EmptyState, LoadingRows } from '@/components/ui';
import { getReflectionsQuery } from '@/modules/reflections/queries';
import { getContactsQuery } from '@/modules/contacts/queries';
import { Reflection, Contact } from '@promotor/contracts';
import { formatTimeAgo } from '@promotor/platform-core';

export default function ActivityPage() {
  const [reflections, setReflections] = useState<Reflection[] | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    Promise.all([
      getReflectionsQuery(),
      getContactsQuery(),
    ]).then(([reflData, conData]) => {
      setReflections(reflData);
      setContacts(conData);
    });
  }, []);

  const contactMap = new Map(contacts.map(c => [c.id, c]));

  return (
    <PromotorShell>
      <div style={{ padding: '24px 16px', maxWidth: '840px', margin: '0 auto' }}>
        <PageHeader
          kicker="Talira Class"
          title="Aktivitas Pembelajaran"
          sub="Jejak refleksi & penuntusan materi peserta secara terperinci"
        />

        <div style={{ marginTop: '20px' }}>
          {reflections === null ? (
            <LoadingRows rows={3} />
          ) : reflections.length === 0 ? (
            <EmptyState
              title="Belum ada aktivitas baru"
              explanation="Saat peserta menyelesaikan materi atau mengirimkan refleksi belajar, jejak aktivitas akan langsung muncul di sini."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reflections.map(refl => {
                const contact = contactMap.get(refl.contactId);
                const name = contact ? contact.name : 'Peserta';

                return (
                  <div
                    key={refl.id}
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      padding: '16px 18px',
                      borderRadius: '0px',
                      border: '1px solid var(--color-divider)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 780, fontSize: '14px', color: 'var(--color-text-main)' }}>{name}</span>
                      <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }} className="tabular-nums">
                        {formatTimeAgo(refl.submittedAt)}
                      </span>
                    </div>
                    <p style={{ fontSize: '13.5px', color: 'var(--color-text-main)', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
                      &ldquo;{refl.answerText}&rdquo;
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PromotorShell>
  );
}
