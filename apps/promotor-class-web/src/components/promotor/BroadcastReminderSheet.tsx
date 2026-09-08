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
    if (nextIndex >= queue.length) { onClose(); return; }
    const learner = queue[nextIndex];
    window.open(buildWaUrl(learner.phoneE164, buildReminderDraft(learner)), '_blank');
    setCursor(nextIndex);
  };

  return (
    <BottomSheet open={isOpen} onClose={onClose} labelledBy="broadcast-title">
      <h2 id="broadcast-title" style={{ font: '700 16px/1.3 var(--font-sans)' }}>Kirim Pengingat Belajar</h2>
      {current ? (
        <>
          <p className="kicker kicker-muted" style={{ marginTop: 8 }}>
            Mengirim {cursor! + 1} dari {queue.length}: {current.name}
          </p>
          <textarea className="textarea" rows={5} readOnly value={buildReminderDraft(current)} aria-label="Draf pengingat" />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" className="btn btn-primary" onClick={openNext}>Sudah Terkirim — Lanjut</button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Selesai</button>
          </div>
        </>
      ) : (
        <>
          <p className="kicker kicker-muted" style={{ marginTop: 8 }}>Pilih peserta yang mau dikirimi pengingat ({selected.size}/{learners.length}).</p>
          <div style={{ maxHeight: 260, overflowY: 'auto', marginTop: 8 }}>
            {learners.map((l) => (
              <label key={l.contactId} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0' }}>
                <input type="checkbox" checked={selected.has(l.contactId)}
                  onChange={(e) => {
                    const next = new Set(selected);
                    if (e.target.checked) next.add(l.contactId); else next.delete(l.contactId);
                    setSelected(next);
                  }} />
                <span style={{ font: '400 13px/1.4 var(--font-sans)' }}>{l.name} · {l.programTitle} · {l.progressPercent}%</span>
              </label>
            ))}
          </div>
          <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 12 }} disabled={queue.length === 0} onClick={openNext}>
            Mulai Kirim via WhatsApp
          </button>
        </>
      )}
    </BottomSheet>
  );
}
