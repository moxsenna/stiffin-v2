'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PlusIcon, SearchIcon, ChevronRightIcon } from '@/components/foundation/icons';
import { contactQueries, lifecycleQueries } from '@/lib/container';
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 0' }}>
        <h1 style={{ font: '700 24px/29px Inter, sans-serif', color: '#191918' }}>Kontak</h1>
        <Link
          href="/app/contacts/new"
          aria-label="Tambah kontak baru"
          style={{
            width: '44px',
            height: '44px',
            marginRight: '-10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#191918',
            textDecoration: 'none',
          }}
        >
          <PlusIcon size={20} color="#191918" />
        </Link>
      </div>

      {/* Search Bar */}
      <div style={{ padding: '12px 16px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            height: '40px',
            padding: '0 12px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E8E7E3',
            borderRadius: '8px',
          }}
        >
          <SearchIcon size={16} color="#9C9A94" />
          <input
            type="text"
            placeholder="Cari nama atau nomor"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              width: '100%',
              font: '400 14px Inter, sans-serif',
              color: '#191918',
              backgroundColor: 'transparent',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', color: '#9C9A94', cursor: 'pointer' }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '20px', padding: '16px 16px 0', borderBottom: '1px solid #E8E7E3' }}>
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
              style={{
                background: 'none',
                border: 'none',
                padding: '0 0 10px',
                cursor: 'pointer',
                font: '600 14px Inter, sans-serif',
                color: isActive ? '#167A68' : '#71706B',
                borderBottom: isActive ? '2px solid #167A68' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Contacts List */}
      <div style={{ backgroundColor: '#FFFFFF' }}>
        {contacts.length > 0 ? (
          contacts.map((c) => (
            <div
              key={c.id}
              onClick={() => router.push(`/app/contacts/${c.id}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '13px 16px',
                borderBottom: '1px solid #E8E7E3',
                cursor: 'pointer',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: '600 15.5px/21px Inter, sans-serif', color: '#191918' }}>{c.name}</div>
                <div style={{ font: '400 13px/18px Inter, sans-serif', color: '#71706B' }}>
                  {formatPhoneDisplay(c.phoneE164)} · {c.sourceChannel || 'Lead'}
                </div>
              </div>
              <span style={{ font: '450 12.5px Inter, sans-serif', color: c.classification === 'CLIENT' ? '#067647' : '#9C9A94', whiteSpace: 'nowrap' }}>
                {lifecycleQueries.getStageLabel(c.stage)}
              </span>
              <ChevronRightIcon size={16} color="#C6C4BE" />
            </div>
          ))
        ) : (
          <div style={{ padding: '32px 16px', textOverflow: 'ellipsis', textAlign: 'center', color: '#71706B' }}>
            Belum ada kontak yang sesuai.
          </div>
        )}
      </div>
    </AppShell>
  );
}
