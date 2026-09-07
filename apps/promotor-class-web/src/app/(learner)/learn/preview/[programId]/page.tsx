'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { LearnerShell } from '@/components/layout/LearnerShell';
import { LoadingRows, ErrorState } from '@/components/ui';
import { getProgramByIdQuery } from '@/modules/programs/queries';
import { Program } from '@promotor/contracts';

export default function PreviewProgramPage() {
  const params = useParams();
  const programId = params.programId as string;
  const [program, setProgram] = useState<Program | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProgramByIdQuery(programId)
      .then((prog) => {
        if (prog) setProgram(prog);
        else setError('Program tidak ditemukan.');
      })
      .catch(() => setError('Gagal memuat program. Pastikan Anda login sebagai promotor.'));
  }, [programId]);

  return (
    <LearnerShell title="Pratinjau Kelas">
      <div style={{ margin: 12, padding: 12, background: '#fef9c3', border: '1px solid #ca8a04', font: '600 13px/1.4 var(--font-sans)' }}>
        Mode Pratinjau — progres tidak dicatat dan refleksi tidak bisa dikirim.
      </div>
      {error && <ErrorState title="Gagal memuat pratinjau" detail={error} />}
      {!program && !error && <LoadingRows rows={4} />}
      {program && (
        <div style={{ padding: 12 }}>
          <h1 style={{ font: '700 20px/1.3 var(--font-sans)' }}>{program.title}</h1>
          {(program.modules ?? []).map((m, mi) => (
            <section key={m.id} style={{ marginTop: 16 }}>
              <div className="kicker">Modul {mi + 1} — {m.title}</div>
              {(m.lessons ?? []).map((l, li) => (
                <Link key={l.id} href={`/learn/preview/${programId}/lessons/${l.id}`}
                  style={{ display: 'block', padding: 12, border: '1px solid var(--border)', marginTop: 8 }}>
                  <strong style={{ font: '600 14px/1.4 var(--font-sans)' }}>{mi + 1}.{li + 1} {l.title}</strong>
                  <div className="kicker kicker-muted">
                    {l.videoExternalId ? '📹 Video' : ''} {l.textContent ? ' · 📄 Materi teks' : ''} {(l.attachments ?? []).length > 0 ? ` · 📎 ${(l.attachments ?? []).length} lampiran` : ''}
                  </div>
                </Link>
              ))}
            </section>
          ))}
        </div>
      )}
    </LearnerShell>
  );
}
