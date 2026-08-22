'use client';

import React, { useState } from 'react';
import { DemoScenarioPreset } from '@/modules/promotorclass/ports';
import { clock } from '@/lib/container';
import { SettingsIcon } from '@/components/foundation/icons';

export interface DevControlsOverlayProps {
  currentPreset: DemoScenarioPreset;
  onSelectPreset: (preset: DemoScenarioPreset) => Promise<void>;
  onResetDemo: () => Promise<void>;
  onRefresh: () => void;
}

export const DevControlsOverlay: React.FC<DevControlsOverlayProps> = ({
  currentPreset,
  onSelectPreset,
  onResetDemo,
  onRefresh,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [daysAdvanced, setDaysAdvanced] = useState(0);

  // In production builds, this entire dev component evaluates to null
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const handleAdvanceDays = (days: number) => {
    setDaysAdvanced((prev) => prev + days);
    if ('advanceDays' in clock && typeof (clock as any).advanceDays === 'function') {
      (clock as any).advanceDays(days);
    }
    onRefresh();
  };

  const handleResetClock = () => {
    setDaysAdvanced(0);
    if ('setNow' in clock && typeof (clock as any).setNow === 'function') {
      (clock as any).setNow('2026-08-12T10:00:00+07:00');
    }
    onRefresh();
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
        right: '12px',
        zIndex: 150,
      }}
    >
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="touch-target"
          style={{
            height: '32px',
            padding: '0 12px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: '#191918',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '11.5px',
            border: 'none',
            opacity: 0.9,
            boxShadow: 'var(--shadow-md)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <SettingsIcon size={14} color="#FFFFFF" />
          <span>Dev Controls</span>
        </button>
      ) : (
        <div
          style={{
            width: '290px',
            backgroundColor: '#191918',
            color: '#FFFFFF',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: '12px', color: '#9C9A94', letterSpacing: '0.02em' }}>
              Dev & Demo Controls
            </span>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: '#9C9A94', fontSize: '14px', padding: '2px' }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontWeight: 650, fontSize: '12px' }}>Skenario Integrasi Class:</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['FLOW_ONLY', 'BUNDLE_AVAILABLE', 'BUNDLE_CLASS_UNAVAILABLE'] as DemoScenarioPreset[]).map((p) => (
                <button
                  key={p}
                  onClick={async () => {
                    await onSelectPreset(p);
                    onRefresh();
                  }}
                  style={{
                    flex: 1,
                    padding: '6px 2px',
                    fontSize: '10px',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-xs)',
                    border: currentPreset === p ? '1px solid var(--color-primary)' : '1px solid #333',
                    backgroundColor: currentPreset === p ? 'var(--color-primary)' : '#2A2A28',
                    color: '#FFF',
                  }}
                >
                  {p.replace('BUNDLE_', '')}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontWeight: 650, fontSize: '12px' }}>
              Simulasi Tanggal: {clock.formatDayDate()} ({daysAdvanced >= 0 ? `+${daysAdvanced}` : daysAdvanced} hari)
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => handleAdvanceDays(1)}
                style={{
                  flex: 1,
                  padding: '6px',
                  fontSize: '11px',
                  fontWeight: 650,
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: '#2A2A28',
                  color: '#FFF',
                  border: '1px solid #444',
                }}
              >
                +1 Hari
              </button>
              <button
                onClick={() => handleAdvanceDays(7)}
                style={{
                  flex: 1,
                  padding: '6px',
                  fontSize: '11px',
                  fontWeight: 650,
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: '#2A2A28',
                  color: '#FFF',
                  border: '1px solid #444',
                }}
              >
                +7 Hari
              </button>
              <button
                onClick={handleResetClock}
                style={{
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 650,
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: '#2A2A28',
                  color: '#9C9A94',
                  border: '1px solid #444',
                }}
              >
                Reset
              </button>
            </div>
          </div>

          <button
            onClick={async () => {
              await onResetDemo();
              handleResetClock();
            }}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: 'var(--color-danger)',
              color: '#FFF',
              border: 'none',
              fontWeight: 780,
              fontSize: '12px',
            }}
          >
            Reset Demo State
          </button>
        </div>
      )}
    </div>
  );
};
