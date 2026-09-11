'use client';
import React, { useEffect, useState } from 'react';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { PageHeader } from '@/components/ui';
import { getPlatformApiClient } from '@/adapters';
import { formatIDR, formatTimeAgo } from '@promotor/platform-core';

export default function PayoutsPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [available, setAvailable] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [bankId, setBankId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const api = getPlatformApiClient();
      const [b, a, banksRes] = await Promise.all([
        api.listPayouts().catch(() => ({ batches: [] })),
        api.listAvailableOrders().catch(() => ({ orders: [] })),
        api.listBankAccounts().catch(() => ({ accounts: [] })),
      ]);
      setBatches(b.batches ?? []);
      setAvailable((a as any).orders ?? []);
      setBanks(banksRes.accounts ?? []);
      if (!bankId && banksRes.accounts?.[0]) setBankId(banksRes.accounts[0].id);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const submitRequest = async () => {
    if (selected.length === 0) { alert('Pilih minimal 1 order'); return; }
    if (!bankId) { alert('Pilih rekening tujuan dulu di Pengaturan'); return; }
    await getPlatformApiClient().createPayout({ orderIds: selected, bankAccountId: bankId });
    setSelected([]);
    await load();
  };

  if (isLoading) return <PromotorShell><PageHeader kicker="PromotorClass" title="Pencairan" sub="Memuat..." /></PromotorShell>;

  return (
    <PromotorShell>
      <PageHeader kicker="PromotorClass" title="Pencairan" sub="Ajukan order siap cair ke transfer manual" />
      <section>
        <h2>Order siap cair ({available.length})</h2>
        {banks.length === 0 && <p>Tambahkan rekening di Pengaturan dulu sebelum mengajukan.</p>}
        {available.map((o: any) => (
          <label key={o.id} style={{ display: 'flex', gap: 8, padding: 8 }}>
            <input type="checkbox" checked={selected.includes(o.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, o.id] : selected.filter((s) => s !== o.id))} />
            <span>{o.reference} · {formatIDR(o.netAmount ?? o.amount)} · {o.buyerName}</span>
          </label>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <select value={bankId} onChange={(e) => setBankId(e.target.value)}>
            {banks.map((b: any) => <option key={b.id} value={b.id}>{b.bankName} · {b.accountNumber}</option>)}
          </select>
          <button type="button" onClick={submitRequest}>Ajukan pencairan</button>
        </div>
      </section>
      <section style={{ marginTop: 24 }}>
        <h2>Riwayat batch</h2>
        {batches.map((b: any) => (
          <div key={b.id} style={{ padding: 12, borderBottom: '1px solid var(--line)' }}>
            <strong>{formatIDR(b.totalNet)}</strong> · {b.orderCount} order · {b.status} · {formatTimeAgo(b.createdAt)}
            {b.proofUrl && <a href={b.proofUrl} target="_blank" rel="noreferrer"> · Bukti</a>}
          </div>
        ))}
      </section>
    </PromotorShell>
  );
}
