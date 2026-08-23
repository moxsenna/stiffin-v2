'use client';

import React, { useState, useEffect } from 'react';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { getReflectionsQuery } from '@/modules/reflections/queries';
import { getContactsQuery } from '@/modules/contacts/queries';
import { Reflection, Contact } from '@promotor/contracts';
import { formatTimeAgo, formatPhoneDisplay } from '@promotor/platform-core';

export default function ActivityPage() {
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    Promise.all([
      getReflectionsQuery(),
      getContactsQuery(),
    ]).then(([reflData, conData]) => {
      setReflections(reflData || []);
      setContacts(conData || []);
    });
  }, []);

  const contactMap = new Map(contacts.map(c => [c.id, c]));

  return (
    <PromotorShell>
      <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-primary)', backgroundColor: 'var(--color-primary-light)', border: '1px solid var(--color-primary-border)', padding: '2px 8px', borderRadius: 'var(--border-radius-full)' }}>
              Real-time Reflections & Insights
            </span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.035em', color: 'var(--color-text-main)', margin: '0 0 6px' }}>
            Aktivitas Pembelajaran & Jawaban Klien
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0, fontWeight: 500 }}>
            Jejak refleksi mandiri, pemahaman materi, dan kebutuhan tes calon klien secara langsung.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {reflections.length === 0 ? (
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--border-radius-xl)',
                border: '1px solid var(--color-divider)',
                padding: '48px 24px',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                fontSize: '14px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              Belum ada data refleksi pembelajaran yang masuk saat ini.
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
                    padding: '20px 24px',
                    borderRadius: 'var(--border-radius-lg)',
                    border: '1px solid var(--color-divider)',
                    borderLeft: '4px solid var(--color-primary)',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all var(--duration-fast) ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-primary-light)',
                          color: 'var(--color-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '13px',
                        }}
                      >
                        {name.charAt(0)}
                      </div>
                      <div>
                        <span style={{ fontWeight: 800, fontSize: '14.5px', color: 'var(--color-text-main)' }}>
                          {name}
                        </span>
                        {contact && (
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginLeft: '8px' }}>
                            ({formatPhoneDisplay(contact.phoneE164)})
                          </span>
                        )}
                      </div>
                    </div>

                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }} className="tabular-nums">
                      {formatTimeAgo(refl.submittedAt)}
                    </span>
                  </div>

                  <div
                    style={{
                      padding: '12px 16px',
                      backgroundColor: 'var(--color-canvas-subtle)',
                      borderRadius: 'var(--border-radius-md)',
                      fontSize: '13.5px',
                      color: 'var(--color-text-body)',
                      lineHeight: 1.6,
                      fontStyle: 'italic',
                    }}
                  >
                    &ldquo;{refl.answerText}&rdquo;
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </PromotorShell>
  );
}
