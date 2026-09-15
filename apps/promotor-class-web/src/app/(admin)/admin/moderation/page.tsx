'use client';

import React, { useEffect, useState } from 'react';
import { useAdmin } from '../AdminContext';
import { formatIDR, formatTimeAgo } from '@promotor/platform-core';

export default function AdminModerationPage() {
  const { client, adminKey } = useAdmin();
  const [programs, setPrograms] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Takedown modal
  const [takedownProgram, setTakedownProgram] = useState<any>(null);
  const [takedownReason, setTakedownReason] = useState('');
  const [isSubmittingTakedown, setIsSubmittingTakedown] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setActionError('');
    try {
      const [progRes, anomRes] = await Promise.all([
        client.adminListPrograms(statusFilter, adminKey),
        client.adminGetAnomalies(adminKey),
      ]);
      setPrograms(progRes.programs || []);
      setAnomalies(anomRes.anomalies || []);
    } catch (err: any) {
      setActionError(err?.message || 'Gagal memuat katalog dan sinyal anomali fraud.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [statusFilter, adminKey]);

  const handleTakedown = async () => {
    if (!takedownProgram) return;
    if (!takedownReason.trim()) {
      setActionError('Wajib menyertakan alasan takedown/penarikan program.');
      return;
    }
    setIsSubmittingTakedown(true);
    setActionError('');
    setActionSuccess('');
    try {
      await client.adminTakedownProgram(takedownProgram.id, takedownReason.trim(), adminKey);
      setActionSuccess(`Program "${takedownProgram.title}" berhasil di-takedown dari storefront publik.`);
      setTakedownProgram(null);
      setTakedownReason('');
      await load();
    } catch (err: any) {
      setActionError(err?.message || 'Gagal melakukan takedown program.');
    } finally {
      setIsSubmittingTakedown(false);
    }
  };

  const handleRestore = async (prog: any) => {
    setActionError('');
    setActionSuccess('');
    try {
      await client.adminRestoreProgram(prog.id, adminKey);
      setActionSuccess(`Program "${prog.title}" berhasil dipulihkan statusnya.`);
      await load();
    } catch (err: any) {
      setActionError(err?.message || 'Gagal memulihkan program.');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
            Moderasi Konten & Anti-Fraud (Trust & Safety)
          </h1>
          <p style={{ fontSize: '13px', color: '#94A3B8', marginTop: '4px', margin: 0 }}>
            Deteksi dini anomali carding / pencucian uang, audit materi terbitan, dan 1-klik Kill Switch takedown
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
          ↻ Refresh
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

      {/* 1. Anomaly Detection Engine Banner */}
      <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '18px' }}>🚨</span>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>
            Deteksi Sinyal Anomali & Risiko Finansial
          </div>
        </div>

        {anomalies.length === 0 ? (
          <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34D399', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>✓</span>
            <span>Semua metrik transaksi normal. Tidak ditemukan lonjakan volume mencurigakan atau indikasi carding lintas tenant saat ini.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {anomalies.map((anom: any, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '14px 18px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#F87171', fontSize: '13px' }}>
                    {anom.type}: {anom.organizationName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '2px' }}>
                    {anom.description}
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#FCA5A5', fontWeight: 600 }}>
                  Perlu Peninjauan
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Catalog Review & Kill Switch */}
      <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>Katalog Program Terbitan Seluruh Promotor</div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>Review konten materi kelas, kesesuaian harga, dan kill switch</div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {['all', 'PUBLISHED', 'ARCHIVED', 'DRAFT'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: statusFilter === st ? '1px solid #3B82F6' : '1px solid #334155',
                  backgroundColor: statusFilter === st ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  color: statusFilter === st ? '#60A5FA' : '#94A3B8',
                  cursor: 'pointer',
                }}
              >
                {st === 'all' ? 'Semua Status' : st}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
            Memindai katalog program...
          </div>
        ) : programs.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
            Tidak ada program ditemukan dengan filter ini.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E293B', color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '10px 12px' }}>Program Title & ID</th>
                  <th style={{ padding: '10px 12px' }}>Organisasi Promotor</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Harga</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px' }}>Terakhir Diubah</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Aksi Moderasi</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((prog: any) => {
                  const isPublished = prog.status === 'PUBLISHED';
                  const isArchived = prog.status === 'ARCHIVED';
                  return (
                    <tr key={prog.id} style={{ borderBottom: '1px solid #1E293B', color: '#E2E8F0' }}>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 700, color: '#FFFFFF' }}>{prog.title}</div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                          ID: {prog.id.slice(0, 8)} | slug: {prog.slug}
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 600 }}>{prog.organizationName}</div>
                        {prog.organizationSlug && (
                          <a
                            href={`https://class.ralivo.biz.id/${prog.organizationSlug}/${prog.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: '11px', color: '#38BDF8', textDecoration: 'none' }}
                          >
                            Buka Storefront ↗
                          </a>
                        )}
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 700, color: '#FFFFFF' }}>
                        {formatIDR(prog.priceAmount || 0)}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor:
                              isPublished
                                ? 'rgba(16, 185, 129, 0.15)'
                                : isArchived
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(245, 158, 11, 0.15)',
                            color:
                              isPublished
                                ? '#34D399'
                                : isArchived
                                ? '#F87171'
                                : '#FBBF24',
                            border: `1px solid ${
                              isPublished
                                ? 'rgba(16, 185, 129, 0.3)'
                                : isArchived
                                ? 'rgba(239, 68, 68, 0.3)'
                                : 'rgba(245, 158, 11, 0.3)'
                            }`,
                          }}
                        >
                          {prog.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', fontSize: '12px', color: '#64748B' }}>
                        {formatTimeAgo(prog.updatedAt || prog.createdAt)}
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          {isPublished && (
                            <button
                              type="button"
                              onClick={() => {
                                setTakedownProgram(prog);
                                setTakedownReason('');
                              }}
                              title="Takedown program dan sembunyikan dari publik"
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                color: '#F87171',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              🛑 Takedown
                            </button>
                          )}
                          {isArchived && (
                            <button
                              type="button"
                              onClick={() => handleRestore(prog)}
                              title="Pulihkan program kembali ke katalog aktif"
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                color: '#34D399',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Pulihkan
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Takedown */}
      {takedownProgram && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', color: '#FFFFFF' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 12px 0', color: '#F87171' }}>Takedown Program (Kill Switch)</h3>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Program <strong>{takedownProgram.title}</strong> akan ditarik dari storefront publik seketika dan statusnya diubah menjadi ARCHIVED demi kepatuhan kebijakan platform.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
                Alasan Takedown / Pelanggaran (Wajib)
              </label>
              <textarea
                value={takedownReason}
                onChange={(e) => setTakedownReason(e.target.value)}
                placeholder="Contoh: Terindikasi skema Ponzi / Materi melanggar hak cipta / Konten terlarang..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#090D16',
                  border: '1px solid #334155',
                  color: '#FFFFFF',
                  fontSize: '13px',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setTakedownProgram(null)}
                disabled={isSubmittingTakedown}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  color: '#CBD5E1',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleTakedown}
                disabled={isSubmittingTakedown}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#EF4444',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isSubmittingTakedown ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmittingTakedown ? 'Menarik Program...' : 'Eksekusi Kill Switch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
