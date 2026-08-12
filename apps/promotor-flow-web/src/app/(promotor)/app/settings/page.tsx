'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { settingsQueries, settingsCommands, promotorClassQueries, promotorClassCommands } from '@/lib/container';
import { PromotorSettings } from '@/modules/settings/ports';
import { DemoScenarioPreset } from '@/modules/promotorclass/ports';
import { formatPhoneDisplay } from '@promotor/platform-core';

export default function SettingsPage() {
  const [settings, setSettings] = useState<PromotorSettings | null>(null);
  const [scenarioPreset, setScenarioPreset] = useState<DemoScenarioPreset>('BUNDLE_AVAILABLE');

  useEffect(() => {
    settingsQueries.getSettings().then(setSettings);
    promotorClassQueries.getIntegrationState().then((res) => setScenarioPreset(res.scenarioPreset));
  }, []);

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

  return (
    <AppShell showBottomNav={true}>
      <div style={{ padding: '12px 16px 8px' }}>
        <h1 style={{ font: '700 24px/29px Inter, sans-serif', color: '#191918' }}>Pengaturan</h1>
        <div style={{ font: '400 13.5px Inter, sans-serif', color: '#71706B', paddingTop: '2px' }}>
          Profil promotor dan status integrasi.
        </div>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E8E7E3', marginTop: '12px', padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ font: '600 12px Inter, sans-serif', color: '#71706B', textTransform: 'uppercase' }}>PROMOTOR</div>
            <div style={{ font: '600 16px Inter, sans-serif', color: '#191918', paddingTop: '2px' }}>{settings.promotorName}</div>
            <div style={{ font: '400 14px Inter, sans-serif', color: '#71706B' }}>
              {formatPhoneDisplay(settings.promotorPhoneE164)}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #E8E7E3', paddingTop: '12px' }}>
            <div style={{ font: '600 12px Inter, sans-serif', color: '#71706B', textTransform: 'uppercase' }}>ORGANISASI</div>
            <div style={{ font: '600 15px Inter, sans-serif', color: '#191918', paddingTop: '2px' }}>{settings.organizationName}</div>
          </div>

          {/* Dev-Only Controls section */}
          {settings.isDevMode && (
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
                  marginTop: '8px',
                }}
              >
                Reset Demo State ke Seed Awal
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
