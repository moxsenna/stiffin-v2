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
      <div style={{ padding: '16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Aktivitas Pembelajaran</h1>
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
          Jejak refleksi & penuntusan materi peserta secara terperinci
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reflections.map(refl => {
            const contact = contactMap.get(refl.contactId);
            const name = contact ? contact.name : 'Peserta';

            return (
              <div
                key={refl.id}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  padding: '14px',
                  borderRadius: 'var(--border-radius-md)',
                  border: '1px solid var(--color-divider)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px' }}>{name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }} className="tabular-nums">
                    {formatTimeAgo(refl.submittedAt)}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-text-main)', fontStyle: 'italic' }}>
                  &ldquo;{refl.answerText}&rdquo;
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </PromotorShell>
  );
}
