'use client';

import React, { useState, useEffect } from 'react';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { getReflectionsQuery } from '@/modules/reflections/queries';
import { getContactsQuery } from '@/modules/contacts/queries';
import { Reflection, Contact } from '@promotor/contracts';
import { formatTimeAgo } from '@promotor/platform-core';

export default function ActivityPage() {
  const [reflections, setReflections] = useState<Reflection[]>([]);
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
      <div style={{ padding: '24px 20px', maxWidth: '860px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 850, letterSpacing: '-0.025em', marginBottom: '4px', color: 'var(--color-text-main)' }}>
            Aktivitas Pembelajaran
          </h1>
          <div style={{ fontSize: '13.5px', color: 'var(--color-text-muted)' }}>
            Jejak refleksi mandiri & progres materi peserta secara terperinci
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reflections.length === 0 ? (
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--color-divider)',
                padding: '36px 20px',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                fontSize: '13.5px',
              }}
            >
              Belum ada data refleksi pembelajaran masuk.
            </div>
          ) : (
            reflections.map(refl => {
              const contact = contactMap.get(refl.contactId);
              const name = contact ? contact.name : 'Peserta';

              return (
                <div
                  key={refl.id}
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    padding: '16px 20px',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--color-divider)',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '14.5px', color: 'var(--color-text-main)' }}>
                      {name}
                    </span>
                    <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', fontWeight: 600 }} className="tabular-nums">
                      {formatTimeAgo(refl.submittedAt)}
                    </span>
                  </div>
                  <p style={{ fontSize: '13.5px', color: 'var(--color-text-body)', fontStyle: 'italic', lineHeight: 1.6, margin: 0 }}>
                    &ldquo;{refl.answerText}&rdquo;
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </PromotorShell>
  );
}
