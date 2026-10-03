'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, SectionHead } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import {
  settingsQueries,
  settingsCommands,
  promotorClassQueries,
  promotorClassCommands,
  availabilityQueries,
  availabilityCommands,
  revenueQueries,
  revenueCommands,
} from '@/lib/container';
import { PromotorSettings } from '@/modules/settings/ports';
import { DemoScenarioPreset } from '@/modules/promotorclass/ports';
import { WeeklyAvailabilityRule } from '@/modules/availability/ports';
import { formatPhoneDisplay } from '@promotor/platform-core';
import { signOut, getSession, UserSession } from '@/lib/auth';
import { getApiMode } from '@/adapters';

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function SettingsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [settings, setSettings] = useState<PromotorSettings | null>(null);
  const [session, setSession] = useState<UserSession | null>(null);
  const [scenarioPreset, setScenarioPreset] = useState<DemoScenarioPreset>('BUNDLE_AVAILABLE');
  const [weeklyRules, setWeeklyRules] = useState<WeeklyAvailabilityRule[]>([]);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [commissionPercent, setCommissionPercent] = useState<string>('');
  const [savingCommission, setSavingCommission] = useState(false);
  const [commissionFeedback, setCommissionFeedback] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() =>{
    getSession().then(setSession);
    settingsQueries.getSettings().then(setSettings);
    revenueQueries.getRevenueSettings().then((res) =>{
      setCommissionPercent(String(res.commissionPercent ?? 0));
    }).catch(() =>{
      setCommissionPercent('0');
    });
    promotorClassQueries.getIntegrationState().then((res) =>{
      if (res.scenarioPreset) setScenarioPreset(res.scenarioPreset);
    });
    availabilityQueries.getWeeklyRules().then((rules) =>{
      const initialized = [1, 2, 3, 4, 5, 6, 0].map((d) =>{
        const found = rules.find((r) =>r.dayOfWeek === d);
        return (
          found ?? {
            dayOfWeek: d,
            startTime: '09:00',
            endTime: '17:00',
            isActive: d >= 1 && d <= 5,
          }
        );
      });
      setWeeklyRules(initialized);
    });
  }, []);

  const handleRuleToggle = (dayOfWeek: number) =>{
    setWeeklyRules((prev) =>
     prev.map((r) =>(r.dayOfWeek === dayOfWeek ? { ...r, isActive: !r.isActive } : r))
    );
  };

  const handleRuleTimeChange = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) =>{
    setWeeklyRules((prev) =>
     prev.map((r) =>(r.dayOfWeek === dayOfWeek ? { ...r, [field]: value } : r))
    );
  };

  const handleSaveAvailability = async () =>{
    setSavingAvailability(true);
    setSaveFeedback(null);
    try {
      for (const r of weeklyRules) {
        if (r.isActive && r.startTime >= r.endTime) {
          showToast(`Jam mulai (${r.startTime}) harus lebih awal dari jam selesai (${r.endTime}) pada hari ${DAY_NAMES[r.dayOfWeek]}`, 'error');
          setSavingAvailability(false);
          return;
        }
      }
      const saved = await availabilityCommands.saveWeeklyRules(weeklyRules);
      setWeeklyRules(saved);
      setSaveFeedback('Jadwal ketersediaan berhasil disimpan.');
      showToast('Jadwal ketersediaan berhasil disimpan.', 'success');
      setTimeout(() => setSaveFeedback(null), 4000);
    } catch (err: any) {
      showToast(`Gagal menyimpan jadwal: ${err.message || 'Terjadi kesalahan'}`, 'error');
    } finally {
      setSavingAvailability(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      router.replace('/login');
    } catch {
      router.replace('/login');
    }
  };

  const handleReset = async () => {
    await settingsCommands.resetDemo();
    const updatedSettings = await settingsQueries.getSettings();
    setSettings(updatedSettings);
    const res = await promotorClassQueries.getIntegrationState();
    if (res.scenarioPreset) setScenarioPreset(res.scenarioPreset);
    showToast('Demo state berhasil di-reset ke data seed awal.', 'success');
  };

  const handleScenarioChange = async (preset: DemoScenarioPreset) => {
    await promotorClassCommands.setDemoScenario(preset);
    setScenarioPreset(preset);
  };

  const handleSaveCommission = async () => {
    const value = Number(commissionPercent);
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      showToast('Persen komisi harus bilangan bulat 0–100.', 'error');
      return;
    }
    setSavingCommission(true);
    setCommissionFeedback(null);
    try {
      const saved = await revenueCommands.updateRevenueSettings(value);
      setCommissionPercent(String(saved.commissionPercent));
      setCommissionFeedback('Pengaturan disimpan');
      showToast('Pengaturan komisi berhasil disimpan', 'success');
      setTimeout(() => setCommissionFeedback(null), 4000);
    } catch (err: any) {
      showToast(`Gagal menyimpan komisi: ${err.message || 'Terjadi kesalahan'}`, 'error');
    } finally {
      setSavingCommission(false);
    }
  };

  if (!settings) {
    return (
      <AppShell showBottomNav={true}>
       <PageHeader kicker="Akun" title="Pengaturan" />
       <SectionHead label="Memuat" />
     </AppShell>
   );
  }

  const isMockDevMode = getApiMode() === 'mock' && settings.isDevMode;

  return (
    <AppShell showBottomNav={true}>
      <PageHeader kicker="Akun" title="Pengaturan" sub="Profil promotor, jadwal ketersediaan konsultasi, dan sesi akun." />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Promotor Profile Hero Card */}
        <div
          className="hv-card"
          style={{
            padding: '20px',
            background: 'var(--ink)',
            color: '#ffffff',
            borderColor: 'transparent',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>
            PROMOTOR AKTIF
          </div>
          <div style={{ marginTop: 8, font: '800 20px/1.2 var(--font-sans)', letterSpacing: '-0.02em', color: '#ffffff' }}>
            {session?.user?.name || settings.promotorName || 'Promotor'}
          </div>
          <div style={{ marginTop: 4, font: '400 13px/1.5 var(--font-sans)', color: 'rgba(255,255,255,0.8)' }}>
            {session?.user?.email || (settings.promotorPhoneE164 ? formatPhoneDisplay(settings.promotorPhoneE164) : 'Belum tersedia')}
          </div>
          <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 12 }}>
            <div style={{ font: '600 10px/1 var(--font-sans)', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em' }}>ORGANISASI</div>
            <div style={{ marginTop: 4, font: '700 14px/1.3 var(--font-sans)', color: '#ffffff' }}>
              {session?.organization?.name || settings.organizationName || 'Belum tersedia'}
            </div>
          </div>
        </div>

        {/* Weekly Availability Card */}
        <div className="hv-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted-strong)' }}>
            Jadwal Ketersediaan Mingguan
          </div>
          <p style={{ marginTop: 4, font: '400 12px/1.4 var(--font-sans)', color: 'var(--muted-strong)' }}>
            Atur hari dan jam kerja untuk booking konsultasi otomatis storefront.
          </p>

          {saveFeedback && (
            <div
              style={{
                marginTop: 12,
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#059669',
                font: '600 12px/1.4 var(--font-sans)',
              }}
            >
              ✓ {saveFeedback}
            </div>
          )}

          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {weeklyRules.map((r) => (
              <div
                key={r.dayOfWeek}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '8px 0',
                  borderBottom: '1px solid var(--surface-hover)',
                }}
              >
                <label htmlFor={`day-${r.dayOfWeek}`} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', minWidth: 100 }}>
                  <input
                    id={`day-${r.dayOfWeek}`}
                    type="checkbox"
                    checked={r.isActive}
                    onChange={() => handleRuleToggle(r.dayOfWeek)}
                    style={{ width: 18, height: 18, accentColor: 'var(--ink)', cursor: 'pointer' }}
                  />
                  <span style={{ font: r.isActive ? '700 13px/1 var(--font-sans)' : '400 13px/1 var(--font-sans)', color: r.isActive ? 'var(--ink)' : 'var(--muted)' }}>
                    {DAY_NAMES[r.dayOfWeek]}
                  </span>
                </label>

                {r.isActive ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="time"
                      aria-label={`${DAY_NAMES[r.dayOfWeek]} jam mulai`}
                      value={r.startTime}
                      onChange={(e) => handleRuleTimeChange(r.dayOfWeek, 'startTime', e.target.value)}
                      className="hv-input"
                      style={{ padding: '6px 8px', fontSize: '13px', width: 'auto' }}
                    />
                    <span style={{ color: 'var(--muted-strong)', font: '400 11px var(--font-sans)' }}>–</span>
                    <input
                      type="time"
                      aria-label={`${DAY_NAMES[r.dayOfWeek]} jam selesai`}
                      value={r.endTime}
                      onChange={(e) => handleRuleTimeChange(r.dayOfWeek, 'endTime', e.target.value)}
                      className="hv-input"
                      style={{ padding: '6px 8px', fontSize: '13px', width: 'auto' }}
                    />
                  </div>
                ) : (
                  <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--muted-light)' }}>Libur</span>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSaveAvailability}
            disabled={savingAvailability}
            className="hv-btn-primary"
            style={{ marginTop: 16, width: '100%', padding: '12px', fontSize: '14px' }}
          >
            {savingAvailability ? 'Menyimpan...' : 'Simpan Jadwal Ketersediaan'}
          </button>
        </div>

        {/* Commission Settings Card */}
        <div className="hv-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted-strong)' }}>
            Komisi STIFIn
          </div>
          <p style={{ marginTop: 4, font: '400 12px/1.4 var(--font-sans)', color: 'var(--muted-strong)' }}>
            Persen bagi hasil untuk estimasi omzet pada ringkasan dashboard.
          </p>

          {commissionFeedback && (
            <div
              style={{
                marginTop: 12,
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#059669',
                font: '600 12px/1.4 var(--font-sans)',
              }}
            >
              ✓ {commissionFeedback}
            </div>
          )}

          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              aria-label="Komisi STIFIn (%)"
              min={0}
              max={100}
              step={1}
              value={commissionPercent}
              onChange={(e) => setCommissionPercent(e.target.value)}
              className="hv-input"
              style={{ width: 100, fontWeight: 700 }}
            />
            <span style={{ font: '700 14px/1 var(--font-sans)', color: 'var(--muted-strong)' }}>%</span>
          </div>

          <button
            type="button"
            onClick={handleSaveCommission}
            disabled={savingCommission}
            className="hv-btn-sec"
            style={{ marginTop: 12, width: '100%', padding: '12px', fontSize: '14px' }}
          >
            {savingCommission ? 'Menyimpan...' : 'Simpan Persentase Komisi'}
          </button>
        </div>

        {/* Account Session Card */}
        <div className="hv-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted-strong)' }}>
            Sesi Akun
          </div>
          <p style={{ marginTop: 4, font: '400 12px/1.4 var(--font-sans)', color: 'var(--muted-strong)' }}>
            Keluar dari sesi promotor pada perangkat ini.
          </p>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              marginTop: 14,
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.08)',
              color: '#dc2626',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            {loggingOut ? 'Memproses Keluar...' : 'Keluar dari Akun (Logout)'}
          </button>
        </div>

        {/* Dev Controls */}
        {isMockDevMode && (
          <div className="hv-card" style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.05)', borderColor: 'rgba(245, 158, 11, 0.25)' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#d97706' }}>
              Dev controls · skenario demo
            </div>
            <p style={{ marginTop: 4, font: '400 12px/1.4 var(--font-sans)', color: 'var(--muted-strong)' }}>
              Pilih skenario integrasi Ralivo Class untuk menguji entitlement dan outage:
            </p>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
           {[
              { key: 'FLOW_ONLY', label: 'FLOW_ONLY (Ralivo Flow Standalone)' },
              { key: 'BUNDLE_AVAILABLE', label: 'BUNDLE_AVAILABLE (Integrasi Class Aktif)' },
              { key: 'BUNDLE_CLASS_UNAVAILABLE', label: 'BUNDLE_CLASS_UNAVAILABLE (Class Outage)' },
            ].map((sc) =>(
              <button
                key={sc.key}
                type="button"
                onClick={() =>handleScenarioChange(sc.key as DemoScenarioPreset)}
                className="list-row"
                style={{
                  border: scenarioPreset === sc.key ? '2px solid var(--ink)' : undefined,
                  fontWeight: scenarioPreset === sc.key ? 700 : 500,
                  background: 'transparent',
                }}
              >
                {sc.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={handleReset} className="hv-btn-sec" style={{ marginTop: 12, padding: '8px 14px', fontSize: '12px' }}>
            Reset Demo State
          </button>
        </div>
      )}
        <div style={{ height: 24 }} />
      </div>
    </AppShell>
  );
}
