'use client';

import React, { useEffect, useState } from 'react';
import { useAdmin } from '../AdminContext';
import { formatTimeAgo } from '@promotor/platform-core';

export default function AdminTenantsPage() {
  const { client, adminKey } = useAdmin();
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Impersonation state
  const [isImpersonating, setIsImpersonating] = useState<string | null>(null);

  // Override Subscription modal
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [planCode, setPlanCode] = useState('PRO');
  const [subscriptionStatus, setSubscriptionStatus] = useState('ACTIVE');
  const [daysToAdd, setDaysToAdd] = useState('30');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  // Suspend modal
  const [suspendingTenant, setSuspendingTenant] = useState<any>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [isSubmittingSuspend, setIsSubmittingSuspend] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setActionError('');
    try {
      const res = await client.adminListTenants(adminKey);
      setTenants(res.tenants || []);
    } catch (err: any) {
      setActionError(err?.message || 'Gagal memuat daftar tenant promotor.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [adminKey]);

  const handleImpersonate = async (tenant: any) => {
    setIsImpersonating(tenant.id);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await client.adminImpersonateTenant(tenant.id, adminKey);
      if (res.success && res.token) {
        // Save token to localStorage for Promotor app
        localStorage.setItem('promotor_session_token', res.token);
        setActionSuccess(`Sesi Impersonation aktif untuk ${tenant.name}. Membuka dashboard promotor...`);
        // Open launchPath in new tab
        window.open(res.launchPath || '/app', '_blank');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Gagal melakukan impersonasi tenant.');
    } finally {
      setIsImpersonating(null);
    }
  };

  const handleOverrideSubscription = async () => {
    if (!selectedTenant) return;
    setIsSubmittingOverride(true);
    setActionError('');
    setActionSuccess('');
    try {
      const expiresAt = daysToAdd ? new Date(Date.now() + parseInt(daysToAdd, 10) * 86400 * 1000).toISOString() : undefined;
      await client.adminOverrideSubscription(
        selectedTenant.id,
        {
          planCode,
          status: subscriptionStatus,
          expiresAt,
        },
        adminKey
      );
      setActionSuccess(`Paket langganan untuk ${selectedTenant.name} berhasil diperbarui.`);
      setSelectedTenant(null);
      await load();
    } catch (err: any) {
      setActionError(err?.message || 'Gagal mengubah paket langganan.');
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  const handleToggleSuspend = async (tenant: any) => {
    if (tenant.status === 'SUSPENDED') {
      // Re-activate
      try {
        await client.adminActivateTenant(tenant.id, adminKey);
        setActionSuccess(`Tenant ${tenant.name} berhasil diaktifkan kembali.`);
        await load();
      } catch (err: any) {
        setActionError(err?.message || 'Gagal mengaktifkan tenant.');
      }
    } else {
      // Prompt suspend modal
      setSuspendingTenant(tenant);
      setSuspendReason('');
    }
  };

  const handleConfirmSuspend = async () => {
    if (!suspendingTenant) return;
    if (!suspendReason.trim()) {
      setActionError('Wajib menyertakan alasan pembekuan akun promotor.');
      return;
    }
    setIsSubmittingSuspend(true);
    setActionError('');
    try {
      await client.adminSuspendTenant(suspendingTenant.id, suspendReason.trim(), adminKey);
      setActionSuccess(`Akun promotor ${suspendingTenant.name} berhasil dibekukan (SUSPENDED).`);
      setSuspendingTenant(null);
      await load();
    } catch (err: any) {
      setActionError(err?.message || 'Gagal membekukan tenant.');
    } finally {
      setIsSubmittingSuspend(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
            Tenant Management & Impersonation
          </h1>
          <p style={{ fontSize: '13px', color: '#94A3B8', marginTop: '4px', margin: 0 }}>
            Direktori seluruh organisasi promotor, 1-click &quot;Login As&quot; tanpa tanya password, override paket & limit
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

      {/* Tenants Table */}
      <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', padding: '24px' }}>
        <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', marginBottom: '16px' }}>
          Daftar Organisasi Promotor ({tenants.length})
        </div>

        {isLoading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
            Memuat daftar tenant promotor...
          </div>
        ) : tenants.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
            Belum ada tenant terdaftar.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E293B', color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '10px 12px' }}>Nama Organisasi & Slug</th>
                  <th style={{ padding: '10px 12px' }}>Paket Langganan</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Total Kontak Flow</th>
                  <th style={{ padding: '10px 12px' }}>Status Akun</th>
                  <th style={{ padding: '10px 12px' }}>Dibuat</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Aksi Manajemen</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t: any) => {
                  const isSuspended = t.status === 'SUSPENDED';
                  const isWorking = isImpersonating === t.id;
                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid #1E293B', color: '#E2E8F0' }}>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 700, color: '#FFFFFF' }}>{t.name}</div>
                        <div style={{ fontSize: '11px', color: '#38BDF8', fontFamily: 'monospace' }}>
                          ralivo.com/{t.slug}
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: 'rgba(59, 130, 246, 0.15)',
                            color: '#60A5FA',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                          }}
                        >
                          {t.planCode || 'FREE'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center', fontWeight: 700, color: '#CBD5E1' }}>
                        {t.contactsCount} Kontak
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: isSuspended ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: isSuspended ? '#F87171' : '#34D399',
                            border: `1px solid ${isSuspended ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                          }}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', fontSize: '12px', color: '#64748B' }}>
                        {formatTimeAgo(t.createdAt)}
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          {/* 1-Click Login As */}
                          <button
                            type="button"
                            onClick={() => handleImpersonate(t)}
                            disabled={isWorking}
                            title="Masuk ke dashboard promotor ini tanpa password"
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#2563EB',
                              color: '#FFFFFF',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: isWorking ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {isWorking ? 'Membuat Sesi...' : '🔑 Login As'}
                          </button>

                          {/* Override subscription */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTenant(t);
                              setPlanCode(t.planCode || 'PRO');
                              setSubscriptionStatus(t.status || 'ACTIVE');
                              setDaysToAdd('30');
                            }}
                            title="Ubah paket, batas kuota, atau masa aktif"
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#1E293B',
                              color: '#CBD5E1',
                              border: '1px solid #334155',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            ⚙️ Override
                          </button>

                          {/* Suspend / Activate */}
                          <button
                            type="button"
                            onClick={() => handleToggleSuspend(t)}
                            title={isSuspended ? 'Aktifkan kembali akun' : 'Bekukan akun promotor'}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              backgroundColor: isSuspended ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: isSuspended ? '#34D399' : '#F87171',
                              border: `1px solid ${isSuspended ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {isSuspended ? 'Aktifkan' : 'Bekukan'}
                          </button>
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

      {/* Override Subscription Modal */}
      {selectedTenant && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', color: '#FFFFFF' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 12px 0' }}>Subscription Override: {selectedTenant.name}</h3>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Ubah langsung status paket langganan dan perpanjang masa aktif tanpa melalui transaksi pembayaran.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
                Paket Langganan (Plan Code)
              </label>
              <select
                value={planCode}
                onChange={(e) => setPlanCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#090D16',
                  border: '1px solid #334155',
                  color: '#FFFFFF',
                  fontSize: '13px',
                }}
              >
                <option value="FREE">FREE (Gratis / Standar)</option>
                <option value="STARTER">STARTER</option>
                <option value="PRO">PRO (Class + Flow Lengkap)</option>
                <option value="ENTERPRISE">ENTERPRISE (VIP Unlimited)</option>
              </select>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
                Status Langganan
              </label>
              <select
                value={subscriptionStatus}
                onChange={(e) => setSubscriptionStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#090D16',
                  border: '1px solid #334155',
                  color: '#FFFFFF',
                  fontSize: '13px',
                }}
              >
                <option value="ACTIVE">ACTIVE (Aktif)</option>
                <option value="TRIAL">TRIAL (Uji Coba)</option>
                <option value="EXPIRED">EXPIRED (Kadaluarsa)</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
                Perpanjang Masa Aktif (Hari dari Sekarang)
              </label>
              <input
                type="number"
                value={daysToAdd}
                onChange={(e) => setDaysToAdd(e.target.value)}
                placeholder="30"
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
                onClick={() => setSelectedTenant(null)}
                disabled={isSubmittingOverride}
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
                onClick={handleOverrideSubscription}
                disabled={isSubmittingOverride}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#2563EB',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isSubmittingOverride ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmittingOverride ? 'Menyimpan...' : 'Terapkan Override'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Confirmation Modal */}
      {suspendingTenant && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', color: '#FFFFFF' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 12px 0', color: '#F87171' }}>Bekukan Akun Promotor</h3>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Organisasi <strong>{suspendingTenant.name}</strong> akan dibekukan. Promotor tidak dapat memproses pesanan baru atau mengubah materi kelas hingga diaktifkan kembali.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
                Alasan Pembekuan (Wajib)
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Contoh: Pelanggaran Kebijakan Privasi / Konten Terlarang..."
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
                onClick={() => setSuspendingTenant(null)}
                disabled={isSubmittingSuspend}
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
                onClick={handleConfirmSuspend}
                disabled={isSubmittingSuspend}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#EF4444',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isSubmittingSuspend ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmittingSuspend ? 'Memproses...' : 'Bekukan Akun Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
