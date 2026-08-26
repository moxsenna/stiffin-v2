'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, SectionHead } from '@/components/ui';
import {
  settingsQueries,
  settingsCommands,
  promotorClassQueries,
  promotorClassCommands,
  availabilityQueries,
  availabilityCommands,
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
  const [settings, setSettings] = useState<PromotorSettings | null>(null);
  const [session, setSession] = useState<UserSession | null>(null);
  const [scenarioPreset, setScenarioPreset] = useState<DemoScenarioPreset>('BUNDLE_AVAILABLE');
  const [weeklyRules, setWeeklyRules] = useState<WeeklyAvailabilityRule[]>([]);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() =>{
    getSession().then(setSession);
    settingsQueries.getSettings().then(setSettings);
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
          alert(`Jam mulai (${r.startTime}) harus lebih awal dari jam selesai (${r.endTime}) pada hari ${DAY_NAMES[r.dayOfWeek]}`);
          setSavingAvailability(false);
          return;
        }
      }
      const saved = await availabilityCommands.saveWeeklyRules(weeklyRules);
      setWeeklyRules(saved);
      setSaveFeedback('Jadwal ketersediaan berhasil disimpan.');
      setTimeout(() =>setSaveFeedback(null), 4000);
    } catch (err: any) {
      alert(`Gagal menyimpan jadwal: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setSavingAvailability(false);
    }
  };

  const handleLogout = async () =>{
    setLoggingOut(true);
    try {
      await signOut();
      router.replace('/login');
    } catch {
      router.replace('/login');
    }
  };

  const handleReset = async () =>{
    await settingsCommands.resetDemo();
    const updatedSettings = await settingsQueries.getSettings();
    setSettings(updatedSettings);
    const res = await promotorClassQueries.getIntegrationState();
    if (res.scenarioPreset) setScenarioPreset(res.scenarioPreset);
    alert('Demo state berhasil di-reset ke data seed awal.');
  };

  const handleScenarioChange = async (preset: DemoScenarioPreset) =>{
    await promotorClassCommands.setDemoScenario(preset);
    setScenarioPreset(preset);
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

      <div className="ink-hero">
        <div className="kicker kicker-on-ink">PROMOTOR</div>
        <div style={{ marginTop: 10, font: '800 19px/1.2 var(--font-sans)', letterSpacing: '-0.02em' }}>
          {session?.user?.name || settings.promotorName || 'Promotor'}
         </div>
        <div style={{ marginTop: 6, font: '400 12px/1.5 var(--font-sans)', color: 'var(--on-ink-muted)' }}>
          {session?.user?.email || (settings.promotorPhoneE164 ? formatPhoneDisplay(settings.promotorPhoneE164) : 'Belum tersedia')}
         </div>
        <div style={{ marginTop: 14, borderTop: '1px solid var(--on-ink-line)', paddingTop: 12 }}>
          <div style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--on-ink-muted)' }}>ORGANISASI</div>
         <div style={{ marginTop: 6, font: '600 14px/1.3 var(--font-sans)' }}>
           {session?.organization?.name || settings.organizationName || 'Belum tersedia'}
          </div>
       </div>
     </div>

     <SectionHead label="Jadwal ketersediaan mingguan" />
     <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--line)' }}>
       <p className="muted-note">Atur hari dan jam kerja untuk booking konsultasi storefront.</p>

       {saveFeedback && (
          <div style={{ marginTop: 12, padding: '8px 12px', border: '2px solid var(--ink)', background: 'var(--surface-muted)', font: '600 12px/1.4 var(--font-sans)' }}>
           {saveFeedback}
          </div>
       )}

        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column' }}>
         {weeklyRules.map((r) =>(
            <div key={r.dayOfWeek} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 0', borderBottom: '1px solid var(--surface-hover)' }}>
             <label htmlFor={`day-${r.dayOfWeek}`} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', minWidth: 110 }}>
               <input
                  type="checkbox"
                  checked={r.isActive}
                  onChange={() =>handleRuleToggle(r.dayOfWeek)}
                  style={{ width: 16, height: 16, accentColor: 'var(--ink)', cursor: 'pointer' }}
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
                    onChange={(e) =>handleRuleTimeChange(r.dayOfWeek, 'startTime', e.target.value)}
                    style={{ padding: '5px 6px', border: '1px solid var(--line)', background: 'var(--surface)', font: '500 13px var(--font-sans)', color: 'var(--ink)' }}
                  />
                 <span style={{ color: 'var(--muted)', font: '400 12px var(--font-sans)' }}>s/d</span>
                 <input
                    type="time"
                    aria-label={`${DAY_NAMES[r.dayOfWeek]} jam selesai`}
                    value={r.endTime}
                    onChange={(e) =>handleRuleTimeChange(r.dayOfWeek, 'endTime', e.target.value)}
                    style={{ padding: '5px 6px', border: '1px solid var(--line)', background: 'var(--surface)', font: '500 13px var(--font-sans)', color: 'var(--ink)' }}
                  />
               </div>
             ) : (
                <span style={{ font: '400 12px/1 var(--font-sans)', color: 'var(--muted-light)' }}>Tutup / Libur</span>
             )}
            </div>
         ))}
        </div>

       <button type="button" onClick={handleSaveAvailability} disabled={savingAvailability} className="btn btn-primary btn-block" style={{ marginTop: 16 }}>
         {savingAvailability ? 'Menyimpan...' : 'Simpan Jadwal Ketersediaan'}
        </button>
     </div>

     <SectionHead label="Sesi akun" />
     <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--line)' }}>
       <button type="button" onClick={handleLogout} disabled={loggingOut} className="btn btn-danger btn-block">
         {loggingOut ? 'Memproses Keluar...' : 'Keluar dari Akun (Logout)'}
        </button>
     </div>

     {isMockDevMode && (
        <div className="section-block" style={{ borderBottom: 'none' }}>
         <div className="kicker kicker-accent">Dev controls · skenario demo</div>
         <p className="muted-note" style={{ marginTop: 8 }}>
           Pilih skenario integrasi PromotorClass untuk menguji perilaku entitlement dan outage:
          </p>
         <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
           {[
              { key: 'FLOW_ONLY', label: 'FLOW_ONLY (PromotorFlow Standalone)' },
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
         <button type="button" onClick={handleReset} className="btn btn-accent btn-sm" style={{ marginTop: 12 }}>
           Reset Demo State
          </button>
       </div>
     )}
      <div style={{ height: 24 }} />
   </AppShell>
 );
}
