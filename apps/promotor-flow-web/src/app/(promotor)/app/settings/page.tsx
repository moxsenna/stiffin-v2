'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
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

  useEffect(() => {
    getSession().then(setSession);
    settingsQueries.getSettings().then(setSettings);
    promotorClassQueries.getIntegrationState().then((res) => setScenarioPreset(res.scenarioPreset));
    availabilityQueries.getWeeklyRules().then((rules) => {
      // Ensure all 7 days exist in local state
      const initialized = [1, 2, 3, 4, 5, 6, 0].map((d) => {
        const found = rules.find((r) => r.dayOfWeek === d);
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

  const handleRuleToggle = (dayOfWeek: number) => {
    setWeeklyRules((prev) =>
      prev.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, isActive: !r.isActive } : r))
    );
  };

  const handleRuleTimeChange = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
    setWeeklyRules((prev) =>
      prev.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, [field]: value } : r))
    );
  };

  const handleSaveAvailability = async () => {
    setSavingAvailability(true);
    setSaveFeedback(null);
    try {
      // Validate time order
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
      setTimeout(() => setSaveFeedback(null), 4000);
    } catch (err: any) {
      alert(`Gagal menyimpan jadwal: ${err.message || 'Terjadi kesalahan'}`);
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
    setScenarioPreset(res.scenarioPreset);
    alert('Demo state berhasil di-reset ke data seed awal.');
  };

  const handleScenarioChange = async (preset: DemoScenarioPreset) => {
    await promotorClassCommands.setDemoScenario(preset);
    setScenarioPreset(preset);
  };

  if (!settings) return null;

  const isMockDevMode = getApiMode() === 'mock' && settings.isDevMode;

  return (
    <AppShell showBottomNav={true}>
      <div style={{ padding: '12px 16px 8px' }}>
        <h1 style={{ font: '700 24px/29px Inter, sans-serif', color: '#191918' }}>Pengaturan</h1>
        <div style={{ font: '400 13.5px Inter, sans-serif', color: '#71706B', paddingTop: '2px' }}>
          Profil promotor, jadwal ketersediaan konsultasi, dan sesi akun.
        </div>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E8E7E3', marginTop: '12px', padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ font: '600 12px Inter, sans-serif', color: '#71706B', textTransform: 'uppercase' }}>PROMOTOR</div>
            <div style={{ font: '600 16px Inter, sans-serif', color: '#191918', paddingTop: '2px' }}>
              {session?.user?.name || settings.promotorName}
            </div>
            <div style={{ font: '400 14px Inter, sans-serif', color: '#71706B' }}>
              {session?.user?.email || formatPhoneDisplay(settings.promotorPhoneE164)}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #E8E7E3', paddingTop: '12px' }}>
            <div style={{ font: '600 12px Inter, sans-serif', color: '#71706B', textTransform: 'uppercase' }}>ORGANISASI</div>
            <div style={{ font: '600 15px Inter, sans-serif', color: '#191918', paddingTop: '2px' }}>
              {session?.organization?.name || settings.organizationName}
            </div>
          </div>

          {/* Availability Schedule Section */}
          <div style={{ borderTop: '1px solid #E8E7E3', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <div style={{ font: '600 14px Inter, sans-serif', color: '#191918' }}>Jadwal Ketersediaan Mingguan</div>
                <div style={{ font: '400 12.5px Inter, sans-serif', color: '#71706B' }}>
                  Atur hari dan jam kerja untuk booking konsultasi storefront.
                </div>
              </div>
            </div>

            {saveFeedback && (
              <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: '#ECFDF3', color: '#027A48', font: '500 13px Inter, sans-serif', marginBottom: '12px' }}>
                {saveFeedback}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
              {weeklyRules.map((r) => (
                <div
                  key={r.dayOfWeek}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #E8E7E3',
                    backgroundColor: r.isActive ? '#FAFAF9' : '#F4F3EF',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '100px' }}>
                    <input
                      type="checkbox"
                      checked={r.isActive}
                      onChange={() => handleRuleToggle(r.dayOfWeek)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#167A68' }}
                      id={`day-${r.dayOfWeek}`}
                    />
                    <label
                      htmlFor={`day-${r.dayOfWeek}`}
                      style={{
                        font: r.isActive ? '600 13.5px Inter, sans-serif' : '400 13.5px Inter, sans-serif',
                        color: r.isActive ? '#191918' : '#71706B',
                        cursor: 'pointer',
                      }}
                    >
                      {DAY_NAMES[r.dayOfWeek]}
                    </label>
                  </div>

                  {r.isActive ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="time"
                        value={r.startTime}
                        onChange={(e) => handleRuleTimeChange(r.dayOfWeek, 'startTime', e.target.value)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #D5D3CE',
                          font: '500 13px Inter, sans-serif',
                          backgroundColor: '#FFFFFF',
                        }}
                      />
                      <span style={{ color: '#71706B', font: '400 12px Inter, sans-serif' }}>s/d</span>
                      <input
                        type="time"
                        value={r.endTime}
                        onChange={(e) => handleRuleTimeChange(r.dayOfWeek, 'endTime', e.target.value)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #D5D3CE',
                          font: '500 13px Inter, sans-serif',
                          backgroundColor: '#FFFFFF',
                        }}
                      />
                    </div>
                  ) : (
                    <span style={{ font: '400 12.5px Inter, sans-serif', color: '#8F8E8A' }}>Tutup / Libur</span>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveAvailability}
              disabled={savingAvailability}
              style={{
                marginTop: '16px',
                width: '100%',
                height: '42px',
                backgroundColor: savingAvailability ? '#87BDB2' : '#167A68',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                font: '600 14px Inter, sans-serif',
                cursor: savingAvailability ? 'not-allowed' : 'pointer',
              }}
            >
              {savingAvailability ? 'Menyimpan...' : 'Simpan Jadwal Ketersediaan'}
            </button>
          </div>

          {/* Account Logout Action */}
          <div style={{ borderTop: '1px solid #E8E7E3', paddingTop: '16px' }}>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              style={{
                width: '100%',
                height: '42px',
                backgroundColor: '#FFF1F0',
                color: '#D92D20',
                border: '1px solid #FDA29B',
                borderRadius: '8px',
                font: '600 14px Inter, sans-serif',
                cursor: loggingOut ? 'not-allowed' : 'pointer',
              }}
            >
              {loggingOut ? 'Memproses Keluar...' : 'Keluar dari Akun (Logout)'}
            </button>
          </div>

          {/* Dev-Only Controls section */}
          {isMockDevMode && (
            <div style={{ borderTop: '1px solid #E8E7E3', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ font: '600 12px Inter, sans-serif', color: '#B54708', textTransform: 'uppercase' }}>
                DEV CONTROLS (DEMO SCENARIO)
              </div>
              <div style={{ font: '400 13px Inter, sans-serif', color: '#71706B' }}>
                Pilih skenario integrasi PromotorClass untuk menguji perilaku entitlement dan outage:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { key: 'FLOW_ONLY', label: 'FLOW_ONLY (PromotorFlow Standalone)' },
                  { key: 'BUNDLE_AVAILABLE', label: 'BUNDLE_AVAILABLE (Integrasi Class Aktif)' },
                  { key: 'BUNDLE_CLASS_UNAVAILABLE', label: 'BUNDLE_CLASS_UNAVAILABLE (Class Outage)' },
                ].map((sc) => (
                  <button
                    key={sc.key}
                    onClick={() => handleScenarioChange(sc.key as any)}
                    style={{
                      height: '38px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      border: scenarioPreset === sc.key ? '2px solid #167A68' : '1px solid #D5D3CE',
                      backgroundColor: scenarioPreset === sc.key ? '#EAF5F2' : '#FFFFFF',
                      color: scenarioPreset === sc.key ? '#167A68' : '#191918',
                      font: '500 13px Inter, sans-serif',
                      textAlign: 'left',
                    }}
                  >
                    {sc.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleReset}
                style={{
                  height: '42px',
                  backgroundColor: '#B42318',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  border: 'none',
                  font: '600 14px Inter, sans-serif',
                  cursor: 'pointer',
                  marginTop: '8px',
                }}
              >
                Reset Demo State
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
