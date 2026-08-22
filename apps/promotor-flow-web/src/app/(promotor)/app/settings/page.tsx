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
import { ChevronLeftIcon } from '@/components/foundation/icons';

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
    promotorClassQueries.getIntegrationState().then((res) => {
      if (res.scenarioPreset) setScenarioPreset(res.scenarioPreset);
    });
    availabilityQueries.getWeeklyRules().then((rules) => {
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
    if (res.scenarioPreset) setScenarioPreset(res.scenarioPreset);
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
      <div style={{ padding: '16px 16px 0' }}>
        <button
          onClick={() => router.push('/app/more')}
          className="touch-target"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            color: 'var(--color-text-secondary)',
            fontWeight: 650,
            fontSize: '13px',
            marginBottom: '8px',
          }}
        >
          <ChevronLeftIcon size={16} />
          <span>Kembali ke Lainnya</span>
        </button>

        <h1 style={{ fontSize: '24px', fontWeight: 850, letterSpacing: '-0.03em', color: 'var(--color-text-primary)' }}>
          Pengaturan & Profil
        </h1>
        <div style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', marginTop: '2px', marginBottom: '16px' }}>
          Profil promotor, jadwal jam kerja, dan sesi akun
        </div>
      </div>

      <div style={{ padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Profile Card */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-divider)',
            padding: '20px',
            boxShadow: 'var(--shadow-xs)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', fontWeight: 750, color: 'var(--color-text-tertiary)' }}>
              Identitas Promotor
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', marginTop: '2px' }}>
              {session?.user?.name || settings.promotorName || 'Promotor STIFIn'}
            </div>
            <div style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)' }}>
              {session?.user?.email || (settings.promotorPhoneE164 ? formatPhoneDisplay(settings.promotorPhoneE164) : 'Belum tersedia')}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 750, color: 'var(--color-text-tertiary)' }}>
              Organisasi / Cabang
            </div>
            <div style={{ fontSize: '15px', fontWeight: 750, color: 'var(--color-text-primary)', marginTop: '2px' }}>
              {session?.organization?.name || settings.organizationName || 'STIFIn Brain Consulting'}
            </div>
          </div>
        </div>

        {/* Availability Schedule Card */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-divider)',
            padding: '20px',
            boxShadow: 'var(--shadow-xs)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Jadwal Ketersediaan Mingguan
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              Atur jam kerja untuk booking konsultasi storefront publik.
            </div>
          </div>

          {saveFeedback && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-success-soft)',
                border: '1px solid var(--color-success-border)',
                color: 'var(--color-success)',
                fontWeight: 700,
                fontSize: '13px',
              }}
            >
              ✓ {saveFeedback}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {weeklyRules.map((r) => (
              <div
                key={r.dayOfWeek}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-divider)',
                  backgroundColor: r.isActive ? 'var(--color-canvas)' : 'var(--color-surface-hover)',
                  transition: 'background-color var(--duration-fast) ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '90px' }}>
                  <input
                    type="checkbox"
                    checked={r.isActive}
                    onChange={() => handleRuleToggle(r.dayOfWeek)}
                    style={{ width: '17px', height: '17px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                    id={`day-${r.dayOfWeek}`}
                  />
                  <label
                    htmlFor={`day-${r.dayOfWeek}`}
                    style={{
                      fontWeight: r.isActive ? 780 : 500,
                      fontSize: '13.5px',
                      color: r.isActive ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
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
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid var(--color-border-strong)',
                        fontSize: '13px',
                        fontWeight: 650,
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                    <span style={{ color: 'var(--color-text-tertiary)', fontSize: '12px' }}>—</span>
                    <input
                      type="time"
                      value={r.endTime}
                      onChange={(e) => handleRuleTimeChange(r.dayOfWeek, 'endTime', e.target.value)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid var(--color-border-strong)',
                        fontSize: '13px',
                        fontWeight: 650,
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                  </div>
                ) : (
                  <span style={{ fontSize: '12.5px', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                    Tutup / Libur
                  </span>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleSaveAvailability}
            disabled={savingAvailability}
            className="touch-target-primary"
            style={{
              width: '100%',
              backgroundColor: savingAvailability ? 'var(--color-border-strong)' : 'var(--color-primary)',
              color: '#FFFFFF',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              fontWeight: 780,
              fontSize: '14px',
              cursor: savingAvailability ? 'not-allowed' : 'pointer',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {savingAvailability ? 'Menyimpan...' : 'Simpan Jadwal Ketersediaan'}
          </button>
        </div>

        {/* Account Logout Card */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-divider)',
            padding: '20px',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="touch-target-primary"
            style={{
              width: '100%',
              backgroundColor: 'var(--color-danger-soft)',
              color: 'var(--color-danger)',
              border: '1px solid var(--color-danger-border)',
              borderRadius: 'var(--radius-md)',
              fontWeight: 780,
              fontSize: '14px',
              cursor: loggingOut ? 'not-allowed' : 'pointer',
            }}
          >
            {loggingOut ? 'Memproses Keluar...' : 'Keluar dari Akun (Logout)'}
          </button>
        </div>

        {/* Dev-Only Controls section */}
        {isMockDevMode && (
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-warning-border)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--color-warning)' }}>
              Dev Controls (Demo Scenario)
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Pilih skenario integrasi PromotorClass untuk menguji perilaku outage dan degraded mode:
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
                  className="touch-target"
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: scenarioPreset === sc.key ? '1.5px solid var(--color-primary)' : '1px solid var(--color-divider)',
                    backgroundColor: scenarioPreset === sc.key ? 'var(--color-primary-light)' : 'var(--color-surface)',
                    color: scenarioPreset === sc.key ? 'var(--color-primary)' : 'var(--color-text-primary)',
                    fontWeight: scenarioPreset === sc.key ? 780 : 500,
                    fontSize: '13px',
                    textAlign: 'left',
                    justifyContent: 'flex-start',
                  }}
                >
                  {sc.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleReset}
              className="touch-target"
              style={{
                backgroundColor: 'var(--color-danger)',
                color: '#FFFFFF',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                fontWeight: 780,
                fontSize: '13.5px',
                marginTop: '4px',
              }}
            >
              Reset Demo State
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
