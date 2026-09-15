'use client';

import React, { useEffect, useState } from 'react';
import { useAdmin } from '../AdminContext';
import { formatTimeAgo } from '@promotor/platform-core';

export default function AdminEnginePage() {
  const { client, adminKey } = useAdmin();
  const [health, setHealth] = useState<any>(null);
  const [outbox, setOutbox] = useState<{ summary: any; events: any[] }>({ summary: {}, events: [] });
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setActionError('');
    try {
      const [hRes, oRes, lRes] = await Promise.all([
        client.adminGetHealth(adminKey),
        client.adminGetOutboxStatus(adminKey),
        client.adminGetAuditLogs(adminKey),
      ]);
      setHealth(hRes.health || null);
      setOutbox(oRes || { summary: {}, events: [] });
      setLogs(lRes.logs || []);
    } catch (err: any) {
      setActionError(err?.message || 'Gagal memuat status engine dan audit log.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [adminKey]);

  const handleRetryOutbox = async (id?: string) => {
    setIsRetrying(true);
    setActionError('');
    setActionSuccess('');
    try {
      await client.adminRetryOutbox(id, adminKey);
      setActionSuccess(id ? `Event ${id.slice(0, 8)} dijadwalkan ulang.` : 'Seluruh event outbox yang gagal telah dijadwalkan ulang.');
      await load();
    } catch (err: any) {
      setActionError(err?.message || 'Gagal menjadwalkan ulang event outbox.');
    } finally {
      setIsRetrying(false);
    }
  };

  const s = outbox.summary || { pending: 0, processing: 0, completed: 0, failed: 0 };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
            Engine Room & Monitoring Integrasi
          </h1>
          <p style={{ fontSize: '13px', color: '#94A3B8', marginTop: '4px', margin: 0 }}>
            Kesehatan Neon DB via Hyperdrive, storage Cloudflare R2, status antrean event outbox, dan jejak audit admin
          </p>
        </div>
        <button
          onClick={load}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            backgroundColor: '#1E293B',
            border: '1px solid #334155',
            color: '#CBD5E1',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ↻ Refresh Engine
        </button>
      </div>

      {actionSuccess && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34D399', fontSize: '13px', marginBottom: '20px' }}>
          ✓ {actionSuccess}
        </div>
      )}

      {actionError && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#F87171', fontSize: '13px', marginBottom: '20px' }}>
          ✕ {actionError}
        </div>
      )}

      {/* 1. Health Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {/* Neon DB Latency */}
        <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '14px', padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.04em' }}>LATENSI NEON POSTGRES</div>
          <div style={{ fontSize: '24px', fontWeight: 850, color: '#10B981', marginTop: '6px' }}>
            {health?.dbLatencyMs !== undefined ? `${health.dbLatencyMs} ms` : '—'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
            Terakselerasi Cloudflare Hyperdrive
          </div>
        </div>

        {/* Cloudflare R2 Status */}
        <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '14px', padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.04em' }}>STORAGE CLOUDFLARE R2</div>
          <div style={{ fontSize: '24px', fontWeight: 850, color: '#38BDF8', marginTop: '6px' }}>
            {health?.r2Bucket || 'ACTIVE'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
            Asset uploads & file hosting
          </div>
        </div>

        {/* Email Mailketing */}
        <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '14px', padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.04em' }}>TRANSACTIONAL EMAIL</div>
          <div style={{ fontSize: '24px', fontWeight: 850, color: '#F59E0B', marginTop: '6px' }}>
            {health?.emailMode || 'ACTIVE'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
            {health?.senderEmail || 'info@ralivo.biz.id'}
          </div>
        </div>

        {/* Environment */}
        <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '14px', padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.04em' }}>ENVIRONMENT WORKER</div>
          <div style={{ fontSize: '24px', fontWeight: 850, color: '#A855F7', marginTop: '6px' }}>
            {health?.environment || 'production'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
            Edge Region global Cloudflare
          </div>
        </div>
      </div>

      {/* 2. Integration Outbox Queue */}
      <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>Antrean Outbox & Event Integrasi</div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
              Pending: {s.pending} | Processing: {s.processing} | Selesai: {s.completed} | Gagal: {s.failed}
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleRetryOutbox()}
            disabled={isRetrying}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              cursor: isRetrying ? 'not-allowed' : 'pointer',
            }}
          >
            {isRetrying ? 'Memproses...' : '⚡ Retry Seluruh Event Gagal'}
          </button>
        </div>

        {outbox.events.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
            Antrean outbox bersih. Tidak ada event tertahan.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E293B', color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '10px 12px' }}>Event ID & Tipe</th>
                  <th style={{ padding: '10px 12px' }}>Destination</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Attempts</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px' }}>Pesan Kesalahan</th>
                  <th style={{ padding: '10px 12px' }}>Waktu</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {outbox.events.map((ev: any) => {
                  const isFail = ev.status === 'FAILED';
                  return (
                    <tr key={ev.id} style={{ borderBottom: '1px solid #1E293B', color: '#E2E8F0' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{ev.eventType}</div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>{ev.id.slice(0, 8)}</div>
                      </td>
                      <td style={{ padding: '12px', color: '#CBD5E1' }}>{ev.destination}</td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700 }}>{ev.attempts}</td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: isFail ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: isFail ? '#F87171' : '#34D399',
                            border: `1px solid ${isFail ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                          }}
                        >
                          {ev.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#F87171', fontSize: '11px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ev.lastError || '—'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '12px', color: '#64748B' }}>
                        {formatTimeAgo(ev.createdAt)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {isFail && (
                          <button
                            type="button"
                            onClick={() => handleRetryOutbox(ev.id)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              backgroundColor: '#1E293B',
                              color: '#60A5FA',
                              border: '1px solid #334155',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Admin Audit Trail */}
      <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', padding: '24px' }}>
        <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px' }}>
          Jejak Audit Aktivitas Admin (Audit Trail)
        </div>
        <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '16px' }}>
          Mencatat identitas eksekutor setiap aksi administratif sensitif (Payout, Force-Paid, Refund, Impersonation, Suspend)
        </div>

        {logs.length === 0 ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
            Belum ada jejak audit tersimpan di tabel admin_audit_logs.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E293B', color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '10px 12px' }}>Admin</th>
                  <th style={{ padding: '10px 12px' }}>Aksi</th>
                  <th style={{ padding: '10px 12px' }}>Target</th>
                  <th style={{ padding: '10px 12px' }}>Rincian Aksi</th>
                  <th style={{ padding: '10px 12px' }}>IP Address</th>
                  <th style={{ padding: '10px 12px' }}>Waktu</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((lg: any) => (
                  <tr key={lg.id} style={{ borderBottom: '1px solid #1E293B', color: '#E2E8F0' }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#38BDF8' }}>
                      {lg.adminIdentity}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(59, 130, 246, 0.15)',
                          color: '#60A5FA',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        {lg.action}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ color: '#CBD5E1' }}>{lg.targetType}</div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>{lg.targetId}</div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '11px', fontFamily: 'monospace', color: '#94A3B8', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {typeof lg.details === 'object' ? JSON.stringify(lg.details) : String(lg.details || '—')}
                    </td>
                    <td style={{ padding: '12px', fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                      {lg.ipAddress || '—'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#64748B' }}>
                      {formatTimeAgo(lg.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
