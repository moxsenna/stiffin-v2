'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdmin } from './AdminContext';
import { formatIDR, formatTimeAgo } from '@promotor/platform-core';

export default function AdminDashboardPage() {
  const { client, adminKey } = useAdmin();
  const [data, setData] = useState<{ metrics: any; recentOrders: any[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await client.adminGetDashboardOverview(adminKey);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat metrik eksekutif.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [adminKey]);

  if (isLoading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
        Memuat metrik eksekutif platform...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#F87171' }}>
        {error}
        <button onClick={load} style={{ marginLeft: '12px', padding: '4px 10px', borderRadius: '6px', backgroundColor: '#334155', color: '#FFFFFF', border: 'none', cursor: 'pointer' }}>
          Coba Lagi
        </button>
      </div>
    );
  }

  const m = data?.metrics || {
    totalGmv: 0,
    totalOrdersCount: 0,
    netPlatformRevenue: 0,
    totalSettledPayouts: 0,
    totalTenants: 0,
    totalLearnersCount: 0,
    attachmentRate: 0,
    classEntitledCount: 0,
    flowEntitledCount: 0,
    bothEntitledCount: 0,
    mrrEstimate: 0,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
            Executive Dashboard
          </h1>
          <p style={{ fontSize: '13px', color: '#94A3B8', marginTop: '4px', margin: 0 }}>
            Ringkasan kesehatan finansial, traksi tenant promotor, dan adopsi produk ekosistem Ralivo
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
          ↻ Refresh Data
        </button>
      </div>

      {/* 1. Financial Metrics Grid */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#38BDF8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>
          Finansial & Paycore
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {/* Card 1: Platform GMV */}
          <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '14px', padding: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.04em' }}>TOTAL GMV PLATFORM</div>
            <div style={{ fontSize: '26px', fontWeight: 850, color: '#38BDF8', marginTop: '6px' }}>
              {formatIDR(m.totalGmv)}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              Dari total {m.totalOrdersCount} transaksi sukses
            </div>
          </div>

          {/* Card 2: Net Platform Revenue */}
          <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '14px', padding: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.04em' }}>NET REVENUE (TAKE-RATE)</div>
            <div style={{ fontSize: '26px', fontWeight: 850, color: '#10B981', marginTop: '6px' }}>
              {formatIDR(m.netPlatformRevenue)}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              Pendapatan bersih fee platform Ralivo
            </div>
          </div>

          {/* Card 3: Settled Payouts */}
          <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '14px', padding: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.04em' }}>TOTAL PENCAIRAN TUNTAS</div>
            <div style={{ fontSize: '26px', fontWeight: 850, color: '#F59E0B', marginTop: '6px' }}>
              {formatIDR(m.totalSettledPayouts)}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              Dana terdisbursi ke rekening promotor
            </div>
          </div>

          {/* Card 4: Estimated MRR */}
          <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '14px', padding: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.04em' }}>ESTIMASI MRR LANGGANAN</div>
            <div style={{ fontSize: '26px', fontWeight: 850, color: '#A855F7', marginTop: '6px' }}>
              {formatIDR(m.mrrEstimate)}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              Dari paket berbayar Flow & Class
            </div>
          </div>
        </div>
      </div>

      {/* 2. Product & Adoption Metrics Grid */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#38BDF8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>
          Traksi Tenant & Adopsi Ekosistem
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {/* Card: Total Tenants */}
          <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '14px', padding: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.04em' }}>ORGANISASI / PROMOTOR</div>
            <div style={{ fontSize: '26px', fontWeight: 850, color: '#FFFFFF', marginTop: '6px' }}>
              {m.totalTenants}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              Tenant aktif di platform
            </div>
          </div>

          {/* Card: Total Learners */}
          <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '14px', padding: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.04em' }}>TOTAL PESERTA & PROSPEK</div>
            <div style={{ fontSize: '26px', fontWeight: 850, color: '#FFFFFF', marginTop: '6px' }}>
              {m.totalLearnersCount}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              Basis kontak di seluruh tenant
            </div>
          </div>

          {/* Card: Attachment Rate */}
          <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '14px', padding: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.04em' }}>ATTACHMENT RATE (CLASS + FLOW)</div>
            <div style={{ fontSize: '26px', fontWeight: 850, color: '#34D399', marginTop: '6px' }}>
              {m.attachmentRate}%
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              {m.bothEntitledCount} dari {m.totalTenants} promotor aktif dual-stack
            </div>
          </div>

          {/* Card: Product Breakdown */}
          <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '14px', padding: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.04em' }}>DISTRIBUSI PRODUK</div>
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#CBD5E1' }}>
                <span>Class Aktif:</span>
                <span style={{ fontWeight: 700 }}>{m.classEntitledCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#CBD5E1' }}>
                <span>Flow Aktif:</span>
                <span style={{ fontWeight: 700 }}>{m.flowEntitledCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Live Order Stream Feed */}
      <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>Transaksi Terakhir Seluruh Storefront</div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>Aktivitas realtime order Paycore lintas promotor</div>
          </div>
          <Link
            href="/admin/orders"
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#38BDF8',
              textDecoration: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
            }}
          >
            Lihat Semua Order Stream →
          </Link>
        </div>

        {(!data?.recentOrders || data.recentOrders.length === 0) ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
            Belum ada transaksi Paycore terekam.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E293B', color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '10px 12px' }}>Order ID</th>
                  <th style={{ padding: '10px 12px' }}>Organisasi</th>
                  <th style={{ padding: '10px 12px' }}>Pembeli</th>
                  <th style={{ padding: '10px 12px' }}>Program</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Nominal</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px' }}>Waktu</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((ord: any) => {
                  const isPaid = ord.status === 'PAID';
                  return (
                    <tr key={ord.id} style={{ borderBottom: '1px solid #1E293B', color: '#E2E8F0' }}>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px', color: '#93C5FD' }}>
                        {ord.orderNumber || ord.id.slice(0, 8)}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 600 }}>{ord.organizationName}</td>
                      <td style={{ padding: '12px' }}>
                        <div>{ord.customerName}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{ord.customerEmail}</div>
                      </td>
                      <td style={{ padding: '12px', color: '#CBD5E1' }}>{ord.programTitle}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#FFFFFF' }}>
                        {formatIDR(ord.amount)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: isPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: isPaid ? '#34D399' : '#FBBF24',
                            border: `1px solid ${isPaid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                          }}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '12px', color: '#64748B' }}>
                        {formatTimeAgo(ord.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
