'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PlusIcon, SearchIcon, ChevronRightIcon } from '@/components/foundation/icons';
import { contactQueries } from '@/lib/container';
import { FlowContact } from '@promotor/promotor-flow-fixtures';
import { formatPhoneDisplay } from '@promotor/platform-core';

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<FlowContact[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PROSPECT' | 'CLIENT'>('ALL');

  const loadContacts = useCallback(async () => {
    const list = await contactQueries.listContacts(search, activeFilter);
    setContacts(list);
  }, [search, activeFilter]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  return (
    <AppShell showBottomNav={true}>
      <div style={{ padding: '20px 16px 0' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 850, letterSpacing: '-0.03em', color: 'var(--color-text-primary)' }}>
              Kontak
            </h1>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              <span className="tabular-nums">{contacts.length}</span> kontak terdaftar
            </div>
          </div>

          <Link
            href="/app/contacts/new"
            aria-label="Tambah kontak baru"
            className="touch-target"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-xs)',
              textDecoration: 'none',
            }}
          >
            <PlusIcon size={20} color="#FFFFFF" />
          </Link>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '14px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              height: '44px',
              padding: '0 14px',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border-strong)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <SearchIcon size={18} color="var(--color-text-tertiary)" />
            <input
              type="text"
              placeholder="Cari nama atau nomor WhatsApp..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                width: '100%',
                fontSize: '14px',
                color: 'var(--color-text-primary)',
                backgroundColor: 'transparent',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Hapus pencarian"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-tertiary)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {[
            { key: 'ALL', label: 'Semua' },
            { key: 'PROSPECT', label: 'Prospek' },
            { key: 'CLIENT', label: 'Klien' },
          ].map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key as any)}
                className="touch-target"
                style={{
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-full)',
                  border: isActive ? '1.5px solid var(--color-primary)' : '1px solid var(--color-divider)',
                  backgroundColor: isActive ? 'var(--color-primary-light)' : 'var(--color-surface)',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  fontWeight: isActive ? 780 : 600,
                  fontSize: '13px',
                  transition: 'all var(--duration-fast) ease',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contacts List */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {contacts.length === 0 ? (
          <div
            style={{
              padding: '36px 16px',
              textAlign: 'center',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-divider)',
              color: 'var(--color-text-secondary)',
              fontSize: '13.5px',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            {search ? 'Tidak ada kontak yang cocok dengan pencarian.' : 'Belum ada kontak terdaftar.'}
          </div>
        ) : (
          contacts.map((c) => (
            <div
              key={c.id}
              onClick={() => router.push(`/app/contacts/${c.id}`)}
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-divider)',
                padding: '14px 16px',
                boxShadow: 'var(--shadow-xs)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                transition: 'transform var(--duration-fast) var(--ease-spring)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-text-primary)' }}>
                    {c.name}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 750,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: c.stage === 'LOST' ? 'var(--color-danger-soft)' : 'var(--color-primary-light)',
                      color: c.stage === 'LOST' ? 'var(--color-danger)' : 'var(--color-primary)',
                    }}
                  >
                    {c.stage}
                  </span>
                </div>
                <div className="tabular-nums" style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>
                  {formatPhoneDisplay(c.phoneE164)}
                </div>
                {c.notes && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--color-text-tertiary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {c.notes}
                  </div>
                )}
              </div>
              <ChevronRightIcon size={16} color="var(--color-text-tertiary)" />
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
