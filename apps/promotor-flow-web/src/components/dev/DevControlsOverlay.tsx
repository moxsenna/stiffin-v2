'use client';

import React, { useState } from 'react';
import { DemoScenarioPreset } from '@/modules/promotorclass/ports';
import { clock } from '@/lib/container';

export interface DevControlsOverlayProps {
  currentPreset: DemoScenarioPreset;
  onSelectPreset: (preset: DemoScenarioPreset) =>Promise<void>;
  onResetDemo: () =>Promise<void>;
  onRefresh: () =>void;
}

export const DevControlsOverlay: React.FC<DevControlsOverlayProps>= ({
  currentPreset,
  onSelectPreset,
  onResetDemo,
  onRefresh,
}) =>{
  const [isOpen, setIsOpen] = useState(false);
  const [daysAdvanced, setDaysAdvanced] = useState(0);

  // In production builds, this entire dev component evaluates to null
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const handleAdvanceDays = (days: number) =>{
    setDaysAdvanced((prev) =>prev + days);
    if ('advanceDays' in clock && typeof (clock as any).advanceDays === 'function') {
      (clock as any).advanceDays(days);
    }
    onRefresh();
  };

  const handleResetClock = () =>{
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
        bottom: '70px',
        right: '12px',
        zIndex: 150,
      }}
    >
     {!isOpen ? (
        <button
          onClick={() =>setIsOpen(true)}
          style={{
            height: '28px',
            padding: '0 10px',
            borderRadius: '0px',
            backgroundColor: 'var(--ink)',
            color: '#FFFFFF',
            font: '600 11px var(--font-sans)',
            border: 'none',
            opacity: 0.85,
          }}
        >
          Dev Controls
        </button>
     ) : (
        <div
          style={{
            width: '280px',
            backgroundColor: 'var(--ink)',
            color: '#FFFFFF',
            borderRadius: '0px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <span style={{ font: '600 12px var(--font-sans)', color: 'var(--muted-light)', textTransform: 'uppercase' }}>
             DEV / DEMO CONTROLS
            </span>
           <button
              onClick={() =>setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--muted-light)', fontSize: '14px' }}
            >
             ✕
            </button>
         </div>

         <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
           <span style={{ font: '500 12px var(--font-sans)' }}>Integration Scenario:</span>
           <div style={{ display: 'flex', gap: '4px' }}>
             {(['FLOW_ONLY', 'BUNDLE_AVAILABLE', 'BUNDLE_CLASS_UNAVAILABLE'] as DemoScenarioPreset[]).map((p) =>(
                <button
                  key={p}
                  onClick={async () =>{
                    await onSelectPreset(p);
                    onRefresh();
                  }}
                  style={{
                    flex: 1,
                    padding: '4px 2px',
                    fontSize: '10px',
                    fontWeight: 600,
                    borderRadius: '0px',
                    border: currentPreset === p ? '1px solid var(--accent-dark)' : '1px solid #333',
                    backgroundColor: currentPreset === p ? 'var(--accent-dark)' : '#2A2A28',
                    color: '#FFF',
                  }}
                >
                 {p.replace('BUNDLE_', '')}
                </button>
             ))}
            </div>
         </div>

         <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
           <span style={{ font: '500 12px var(--font-sans)' }}>
             Simulasi Tanggal: {clock.formatDayDate()} ({daysAdvanced >= 0 ? `+${daysAdvanced}` : daysAdvanced} hari)
            </span>
           <div style={{ display: 'flex', gap: '6px' }}>
             <button
                onClick={() =>handleAdvanceDays(1)}
                style={{
                  flex: 1,
                  padding: '4px',
                  fontSize: '11px',
                  borderRadius: '0px',
                  backgroundColor: '#2A2A28',
                  color: '#FFF',
                  border: '1px solid #444',
                }}
              >
               +1 Hari
              </button>
             <button
                onClick={() =>handleAdvanceDays(7)}
                style={{
                  flex: 1,
                  padding: '4px',
                  fontSize: '11px',
                  borderRadius: '0px',
                  backgroundColor: '#2A2A28',
                  color: '#FFF',
                  border: '1px solid #444',
                }}
              >
               +7 Hari (Aftercare)
              </button>
             <button
                onClick={handleResetClock}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  borderRadius: '0px',
                  backgroundColor: '#2A2A28',
                  color: 'var(--muted-light)',
                  border: '1px solid #444',
                }}
              >
               Reset
              </button>
           </div>
         </div>

         <button
            onClick={async () =>{
              await onResetDemo();
              handleResetClock();
            }}
            style={{
              width: '100%',
              padding: '6px',
              borderRadius: '0px',
              backgroundColor: 'var(--accent-dark)',
              color: '#FFF',
              border: 'none',
              font: '600 12px var(--font-sans)',
            }}
          >
           Reset Demo State
          </button>
       </div>
     )}
    </div>
 );
};
