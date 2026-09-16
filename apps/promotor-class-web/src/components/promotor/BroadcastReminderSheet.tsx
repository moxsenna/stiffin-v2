'use client';

import React, { useEffect, useState } from 'react';
import { BottomSheet } from '@/components/ui';
import { buildReminderDraft, buildWaUrl, ReminderLearner } from '@/lib/broadcast';

export interface BroadcastReminderSheetProps {
  isOpen: boolean;
  learners: (ReminderLearner & { contactId: string; phoneE164: string })[];
  onClose: () => void;
}

export function BroadcastReminderSheet({ isOpen, learners, onClose }: BroadcastReminderSheetProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelected(new Set(learners.map((l) => l.contactId)));
      setCursor(null);
    }
  }, [isOpen, learners]);

  if (!isOpen) return null;
  const queue = learners.filter((l) => selected.has(l.contactId));
  const current = cursor !== null ? queue[cursor] : null;

  const openNext = () => {
    const nextIndex = (cursor ?? -1) + 1;
    if (nextIndex >= queue.length) {
      onClose();
      return;
    }
    const learner = queue[nextIndex];
    window.open(buildWaUrl(learner.phoneE164, buildReminderDraft(learner)), '_blank');
    setCursor(nextIndex);
  };

  return (
    <BottomSheet open={isOpen} onClose={onClose} labelledBy="broadcast-title">
      <h2 id="broadcast-title" style={{ fontSize: 17, fontWeight: 850, letterSpacing: '-0.01em' }}>
        Kirim Pengingat Belajar
      </h2>
      {current ? (
        <>
          <p className="pwa-muted" style={{ marginTop: 8 }}>
            Mengirim {cursor! + 1} dari {queue.length}: {current.name}
          </p>
          <textarea className="pwa-input" rows={5} readOnly value={buildReminderDraft(current)} aria-label="Draf pengingat" style={{ marginTop: 10 }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" className="pwa-cta" style={{ flex: 1 }} onClick={openNext}>
              Sudah Terkirim — Lanjut
            </button>
            <button type="button" className="pwa-btn-secondary" onClick={onClose}>
              Selesai
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="pwa-muted" style={{ marginTop: 8 }}>
            Pilih peserta yang mau dikirimi pengingat ({selected.size}/{learners.length}).
          </p>
          <div style={{ maxHeight: 260, overflowY: 'auto', marginTop: 10 }}>
            {learners.map((l) => (
              <label key={l.contactId} className="check-row">
                <input
                  type="checkbox"
                  checked={selected.has(l.contactId)}
                  onChange={(e) => {
                    const next = new Set(selected);
                    if (e.target.checked) next.add(l.contactId);
                    else next.delete(l.contactId);
                    setSelected(next);
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {l.name} · {l.programTitle} · <span className="tabular-nums">{l.progressPercent}%</span>
                </span>
              </label>
            ))}
          </div>
          <button
            type="button"
            className="pwa-cta"
            style={{ marginTop: 12 }}
            disabled={queue.length === 0}
            onClick={openNext}
          >
            Mulai Kirim via WhatsApp
          </button>
        </>
      )}
    </BottomSheet>
  );
}
