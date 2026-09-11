'use client';
import React, { useEffect, useState } from 'react';
import { getPlatformApiClient } from '@/adapters';

export function BankAccountsSection() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');

  const load = async () => {
    const res = await getPlatformApiClient().listBankAccounts().catch(() => ({ accounts: [] }));
    setAccounts(res.accounts ?? []);
  };
  useEffect(() => { void load(); }, []);

  const add = async () => {
    if (!bankName.trim() || !accountNumber.trim() || !accountHolderName.trim()) {
      alert('Lengkapi bank, nomor, dan nama pemilik');
      return;
    }
    await getPlatformApiClient().createBankAccount({ bankName, accountNumber, accountHolderName });
    setBankName(''); setAccountNumber(''); setAccountHolderName('');
    await load();
  };

  return (
    <section style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800 }}>Rekening pencairan</h2>
      <p style={{ fontSize: 13, color: '#6B7280' }}>Wajib ada sebelum mengajukan pencairan.</p>
      {accounts.map((a) => (
        <div key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid #F3F4F6', fontSize: 13 }}>
          <strong>{a.bankName}</strong> · {a.accountNumber} · {a.accountHolderName}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <input placeholder="Bank (BCA)" value={bankName} onChange={(e) => setBankName(e.target.value)} />
        <input placeholder="Nomor rekening" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
        <input placeholder="Nama pemilik" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} />
        <button type="button" onClick={add}>Tambah rekening</button>
      </div>
    </section>
  );
}
