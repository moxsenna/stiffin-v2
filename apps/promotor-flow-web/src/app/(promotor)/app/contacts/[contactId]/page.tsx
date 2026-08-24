'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, SectionHead, ErrorState, LoadingRows, BottomSheet, LifecycleStrip } from '@/components/ui';
import { WhatsAppBottomSheet } from '@/components/today/WhatsAppBottomSheet';
import {
  contactQueries,
  contactCommands,
  lifecycleCommands,
  nextActionQueries,
  nextActionCommands,
  bookingQueries,
  bookingCommands,
  activityQueries,
  messagingQueries,
  messagingCommands,
  promotorClassQueries,
  promotorClassCommands,
  clock,
} from '@/lib/container';
import { FlowContact, FlowNextAction, FlowBooking, FlowActivity, LifecycleStage } from '@promotor/promotor-flow-fixtures';
import { formatPhoneDisplay } from '@promotor/platform-core';
import { ProductEntitlements, LearningContext, ProgramSummary } from '@promotor/contracts';
import { FlowIntegrationHealth } from '@/modules/promotorclass/ports';

const LIFECYCLE_STEPS = ['BARU', 'DIHUBUNGI', 'TERTARIK', 'FOLLOW-UP', 'BOOKED', 'SELESAI'];
const LIFECYCLE_INDEX: Record<string, number>= {
  NEW: 0,
  CONTACTED: 1,
  INTERESTED: 2,
  FOLLOW_UP: 3,
  BOOKED: 4,
  COMPLETED: 5,
};

function stageTagClass(stage: string): string {
  const s = stage.toUpperCase();
  if (s === 'COMPLETED') return 'tag tag-neutral';
  if (s === 'BOOKED' || s === 'FOLLOW_UP') return 'tag tag-accent';
  if (s === 'LOST') return 'tag tag-accent';
  return 'tag tag-outline';
}

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.contactId as string;

  const [contact, setContact] = useState<FlowContact | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actions, setActions] = useState<FlowNextAction[]>([]);
  const [bookings, setBookings] = useState<FlowBooking[]>([]);
  const [activities, setActivities] = useState<FlowActivity[]>([]);
  const [learningContext, setLearningContext] = useState<LearningContext | null>(null);
  const [classState, setClassState] = useState<{
    entitlements: ProductEntitlements;
    integrationHealth: FlowIntegrationHealth;
  } | null>(null);

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [showStageModal, setShowStageModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostReasonInput, setLostReasonInput] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [activeWaModal, setActiveWaModal] = useState<{ draft: string; waUrl: string } | null>(null);

  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [eligiblePrograms, setEligiblePrograms] = useState<ProgramSummary[]>([]);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () =>{
    if (!contactId) return;
    setLoadError(null);
    setNotFound(false);
    try {
      const c = await contactQueries.getContactDetail(contactId);
      setContact(c);
      if (!c) {
        setNotFound(true);
        return;
      }
      setNotesText(c.notes || '');
      const acts = await nextActionQueries.getContactNextActions(contactId);
      setActions(acts);
      const bks = await bookingQueries.getContactBookings(contactId);
      setBookings(bks);
      const evs = await activityQueries.listActivities(contactId);
      setActivities(evs);

      try {
        const int = await promotorClassQueries.getIntegrationState();
        setClassState({ entitlements: int.entitlements, integrationHealth: int.integrationHealth });
        if (int.entitlements.promotorClass && int.integrationHealth.promotorClass === 'AVAILABLE') {
          const lCtx = await promotorClassQueries.getLearningContext(contactId);
          setLearningContext(lCtx);
        } else {
          setLearningContext(null);
        }
      } catch {
        setLearningContext(null);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Tidak dapat memuat kontak.');
    }
  }, [contactId]);

  useEffect(() =>{
    loadData();
  }, [loadData]);

  if (!contact && !loadError && !notFound) {
    return (
      <AppShell showBottomNav={true}>
       <PageHeader kicker="Kontak" title="Memuat..." />
       <LoadingRows rows={5} />
     </AppShell>
   );
  }

  if (loadError) {
    return (
      <AppShell showBottomNav={true}>
       <PageHeader kicker="Kontak" title="Kontak" onBack={() =>router.push('/app/contacts')} />
       <ErrorState title="Gagal memuat kontak" detail={loadError} onRetry={() =>loadData()} />
     </AppShell>
   );
  }

  if (notFound || !contact) {
    return (
      <AppShell showBottomNav={true}>
       <PageHeader kicker="Kontak" title="Kontak tidak ditemukan" onBack={() =>router.push('/app/contacts')} />
       <div className="empty-state">
         <div className="empty-title">Kontak ini tidak ada atau sudah dihapus.</div>
       </div>
     </AppShell>
   );
  }

  const primaryAction = actions.find((a) =>a.status === 'PENDING');
  const activeBooking = bookings.find((b) =>b.status === 'CONFIRMED' || b.status === 'PENDING');

  const handleStageSelect = async (newStage: LifecycleStage) =>{
    setShowStageModal(false);
    if (newStage === 'LOST') {
      setShowLostModal(true);
      return;
    }
    await lifecycleCommands.changeStage(contactId, newStage);
    loadData();
  };

  const handleConfirmLost = async () =>{
    if (!lostReasonInput.trim()) return;
    await lifecycleCommands.changeStage(contactId, 'LOST', lostReasonInput.trim());
    setShowLostModal(false);
    loadData();
  };

  const handleOpenWaForAction = async () =>{
    if (!primaryAction) return;
    const draft = await messagingQueries.generateDraftMessage(
      primaryAction.actionType,
      contact.name,
      { serviceTitle: primaryAction.title }
    );
    const waUrl = messagingQueries.buildWhatsAppUrl(contact.phoneE164, draft);
    setActiveWaModal({ draft, waUrl });
  };

  const handleConfirmWaSent = async (scheduleNextDays?: number) =>{
    if (!primaryAction || !activeWaModal) return;
    await messagingCommands.confirmWhatsAppSent({
      contactId: contact.id,
      actionId: primaryAction.id,
      messageText: activeWaModal.draft,
      scheduleNextFollowUpDays: scheduleNextDays,
    });
    setActiveWaModal(null);
    await loadData();
  };

  const handleCreateNewBooking = async () =>{
    const start = clock.addDays(clock.now(), 2);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const created = await bookingCommands.createBooking({
      contactId: contact.id,
      serviceId: 'srv_tes_personal',
      serviceTitle: 'Tes STIFIn Personal',
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      locationType: 'ON_SITE',
      paymentStatus: 'UNPAID',
      amount: 600000,
    });
    if (created?.id) {
      try {
        await bookingCommands.confirmBooking(created.id);
      } catch {
        // booking stays PENDING if immediate confirmation is unavailable
      }
    }
    setShowBookingModal(false);
    await loadData();
  };

  const handleConfirmBooking = async () =>{
    if (!activeBooking) return;
    await bookingCommands.confirmBooking(activeBooking.id);
    await loadData();
  };

  const handleMarkPaid = async () =>{
    if (!activeBooking) return;
    await bookingCommands.changePaymentStatus(activeBooking.id, 'PAID');
    await loadData();
  };

  const handleOpenEnrollModal = async () =>{
    setEnrollError(null);
    setEnrollSuccess(null);
    setShowEnrollModal(true);
    setEnrollLoading(true);
    try {
      const progs = await promotorClassQueries.listEligiblePrograms({
        organizationId: contact.organizationId || '',
        contactId,
      });
      setEligiblePrograms(progs);
    } catch (err: any) {
      setEnrollError(err?.message || 'Gagal memuat daftar program.');
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleEnrollProgram = async (programId: string) =>{
    setEnrollError(null);
    setEnrollSuccess(null);
    const existing = learningContext?.activeEnrollments.find((e) =>e.programId === programId);
    if (existing) {
      setEnrollError('Peserta sudah terdaftar dalam program ini (duplikat dicegah).');
      return;
    }

    setEnrollLoading(true);
    try {
      await promotorClassCommands.enrollContact({
        organizationId: contact.organizationId || '',
        contactId,
        programId,
        source: 'PROMOTORFLOW_MANUAL',
        idempotencyKey: `enroll:${contactId}:${programId}`,
      });
      setEnrollSuccess('Peserta berhasil didaftarkan ke program!');
      await loadData();
    } catch (err: any) {
      setEnrollError(err?.message || 'Gagal mendaftarkan peserta ke program.');
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleCompleteActiveBooking = async () =>{
    if (!activeBooking) return;
    await bookingCommands.completeBooking(activeBooking.id);
    await loadData();
  };

  const handleSaveNotes = async () =>{
    await contactCommands.updateContactIdentity(contactId, { notes: notesText });
    setIsEditingNotes(false);
    await loadData();
  };

  const stageIdx = LIFECYCLE_INDEX[contact.stage.toUpperCase()] ?? -1;

  return (
    <AppShell showBottomNav={true}>
     <PageHeader
        kicker="Kontak"
        title={contact.name}
        sub={`${formatPhoneDisplay(contact.phoneE164)} · ${contact.sourceChannel || 'Lead'}`}
        backLabel="Kembali"
        onBack={() =>router.push('/app/contacts')}
      />

     {/* Stage + classification */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
       <button type="button" className={stageTagClass(contact.stage)} onClick={() =>setShowStageModal(true)} aria-label="Ubah tahap lifecycle">
         {contact.stage} ▾
        </button>
       <span className={`tag ${contact.classification === 'CLIENT' ? 'tag-neutral' : 'tag-outline'}`}>
         {contact.classification === 'CLIENT' ? 'Klien' : 'Prospek'}
        </span>
     </div>

     {/* Next Action */}
      <SectionHead label="Tindakan berikutnya" />
     <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--line)' }}>
       {primaryAction ? (
          <>
           <div style={{ font: '700 17px/1.25 var(--font-sans)', letterSpacing: '-0.01em' }}>{primaryAction.title}</div>
           <div style={{ marginTop: 6, font: '400 12px/1.45 var(--font-sans)', color: 'var(--muted-strong)' }}>
             {primaryAction.subtitle || `Jatuh tempo: ${clock.formatDayDate(primaryAction.dueAt)}`}
            </div>
           <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
             <button type="button" className="btn btn-primary" onClick={handleOpenWaForAction}>
               Buka WhatsApp
              </button>
             <button
                type="button"
                className="btn btn-secondary"
                onClick={async () =>{
                  const tomorrow = clock.addDays(clock.now(), 1).toISOString();
                  await nextActionCommands.rescheduleNextAction(primaryAction.id, tomorrow);
                  loadData();
                }}
              >
               Tunda
              </button>
           </div>
           <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 8, paddingLeft: 0 }}
              onClick={async () =>{
                const tomorrow = clock.addDays(clock.now(), 1).toISOString();
                await nextActionCommands.skipNextAction(primaryAction.id, {
                  type: 'FOLLOW_UP',
                  title: 'Follow-up prospek',
                  dueAt: tomorrow,
                });
                loadData();
              }}
            >
             Lewati tindakan ini
            </button>
         </>
       ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
           <span style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--muted-strong)' }}>Belum ada tindakan aktif.</span>
           <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={async () =>{
                await nextActionCommands.scheduleNextAction({
                  contactId: contact.id,
                  actionType: 'FOLLOW_UP',
                  title: 'Follow-up prospek',
                  dueAt: clock.addDays(clock.now(), 1).toISOString(),
                });
                loadData();
              }}
            >
             + Tambah tindakan
            </button>
         </div>
       )}
      </div>

     {/* Lifecycle strip */}
      {stageIdx >= 0 && (
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--line)' }}>
         <div className="kicker kicker-muted" style={{ marginBottom: 12 }}>Lifecycle</div>
         <LifecycleStrip stages={LIFECYCLE_STEPS} currentIndex={stageIdx} />
       </div>
     )}

      {/* Booking */}
      <SectionHead label="Booking" />
     <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--line)' }}>
       {activeBooking ? (
          <div>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
             <div style={{ font: '700 15px/1.25 var(--font-sans)' }}>{activeBooking.serviceTitle}</div>
             <span className={`tag ${activeBooking.status === 'CONFIRMED' ? 'tag-neutral' : 'tag-accent'}`}>{activeBooking.status}</span>
           </div>
           <div className="row-meta">
             Jadwal: {clock.formatDayDate(activeBooking.startAt)} {clock.formatTime(activeBooking.startAt)}
            </div>
           <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '12px 0' }}>
             <span style={{ font: '600 12px/1 var(--font-sans)' }}>Status Pembayaran</span>
             <span className={`tag ${activeBooking.paymentStatus === 'PAID' ? 'tag-neutral' : 'tag-accent'}`}>
               Status Pembayaran: {activeBooking.paymentStatus}
              </span>
           </div>
           <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
             {activeBooking.status === 'PENDING' && (
                <button type="button" className="btn btn-primary btn-sm" onClick={handleConfirmBooking}>
                 Konfirmasi Booking
                </button>
             )}
              {activeBooking.paymentStatus === 'UNPAID' && (
                <button type="button" className="btn btn-primary btn-sm" onClick={handleMarkPaid}>
                 Tandai Lunas
                </button>
             )}
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleCompleteActiveBooking}>
               Tandai Layanan Selesai
              </button>
           </div>
         </div>
       ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
           <span style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--muted-strong)' }}>Belum ada booking aktif.</span>
           <button type="button" className="btn btn-secondary btn-sm" onClick={() =>setShowBookingModal(true)}>
             + Buat booking
            </button>
         </div>
       )}
      </div>

     {/* PromotorClass learning context */}
      {classState?.entitlements.promotorClass && (
        <div style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--line)' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px 0' }}>
           <div className="kicker kicker-muted">Konteks belajar · PromotorClass</div>
           <button type="button" className="btn btn-secondary btn-sm" onClick={handleOpenEnrollModal}>
             + Daftarkan ke Kelas
            </button>
         </div>
         <div style={{ padding: '12px 18px 16px' }}>
           {classState.integrationHealth.promotorClass === 'UNAVAILABLE' ? (
              <div style={{ font: '400 12px/1.5 var(--font-sans)', color: 'var(--muted-strong)' }}>
               Integrasi PromotorClass sedang tidak tersedia (degraded mode). Fungsi utama Flow tetap berjalan.
              </div>
           ) : learningContext && learningContext.activeEnrollments.length >0 ? (
              learningContext.activeEnrollments.map((enr: LearningContext['activeEnrollments'][number]) =>(
                <div key={enr.enrollmentId} style={{ paddingTop: 10 }}>
                 <div style={{ font: '600 13px/1.35 var(--font-sans)' }}>{enr.programTitle}</div>
                 <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 9 }}>
                   <div className="progress progress-thin" style={{ flex: 1 }}>
                     <span className="progress-fill progress-accent" style={{ width: `${enr.progressPercent}%` }} />
                   </div>
                   <span style={{ font: '700 11px/1 var(--font-sans)', width: 34, textAlign: 'right' }}>{enr.progressPercent}%</span>
                 </div>
                 <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ marginTop: 8, paddingLeft: 0 }}
                    onClick={() =>alert(`Navigasi ke PromotorClass Learner Detail: /learners/${contact.id}`)}
                  >
                   Lihat aktivitas belajar →
                  </button>
               </div>
             ))
            ) : (
              <div style={{ font: '400 12px/1.5 var(--font-sans)', color: 'var(--muted-strong)' }}>
               Belum ada enrollment aktif di PromotorClass.
              </div>
           )}
          </div>
       </div>
     )}

      {/* Notes */}
      <SectionHead label="Catatan" />
     <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--line)' }}>
       {!isEditingNotes ? (
          <>
           <div style={{ font: '400 14px/1.6 var(--font-sans)', whiteSpace: 'pre-wrap' }}>
             {contact.notes || 'Belum ada catatan.'}
            </div>
           <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() =>setIsEditingNotes(true)}>
             Edit catatan
            </button>
         </>
       ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
           <textarea className="textarea" value={notesText} onChange={(e) =>setNotesText(e.target.value)} rows={4} aria-label="Catatan kontak" />
           <div style={{ display: 'flex', gap: 8 }}>
             <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveNotes}>Simpan</button>
             <button type="button" className="btn btn-secondary btn-sm" onClick={() =>setIsEditingNotes(false)}>Batal</button>
           </div>
         </div>
       )}
      </div>

     {/* Activity timeline */}
      <SectionHead label="Aktivitas" count={`${activities.length}`} />
     <div style={{ padding: '10px 18px 24px' }}>
       {activities.length >0 ? (
          activities.map((ev) =>(
            <div key={ev.id} className="timeline-row">
             <div className="timeline-date">{clock.formatDayDate(ev.timestamp).split(',')[1]?.trim() || 'Hari ini'}</div>
             <div className="timeline-body">
               <div className="timeline-title">{ev.title}</div>
               {ev.detail ? <div className="timeline-detail">{ev.detail}</div>: null}
              </div>
           </div>
         ))
        ) : (
          <div style={{ font: '400 12px/1.5 var(--font-sans)', color: 'var(--muted-strong)' }}>Belum ada riwayat aktivitas.</div>
       )}
      </div>

     {/* Stage selection sheet */}
      <BottomSheet open={showStageModal} onClose={() =>setShowStageModal(false)} labelledBy="stage-sheet-title">
       <h2 id="stage-sheet-title" className="sheet-title-lg">Ubah Tahap Lifecycle</h2>
       <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
         {(['NEW', 'CONTACTED', 'INTERESTED', 'FOLLOW_UP', 'BOOKED', 'COMPLETED', 'LOST'] as LifecycleStage[]).map((stg) =>(
            <button
              key={stg}
              type="button"
              onClick={() =>handleStageSelect(stg)}
              className="list-row"
              style={{
                border: contact.stage === stg ? '2px solid var(--ink)' : undefined,
                fontWeight: contact.stage === stg ? 700 : 500,
                color: stg === 'LOST' ? 'var(--accent-dark)' : 'var(--ink)',
                background: 'transparent',
              }}
            >
             {stg}
            </button>
         ))}
        </div>
       <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 14 }} onClick={() =>setShowStageModal(false)}>
         Batal
        </button>
     </BottomSheet>

     {/* Lost reason sheet */}
      <BottomSheet open={showLostModal} onClose={() =>setShowLostModal(false)} labelledBy="lost-sheet-title">
       <h2 id="lost-sheet-title" className="sheet-title-lg" style={{ color: 'var(--accent-dark)' }}>Alasan Tidak Lanjut (Lost Reason)</h2>
       <p className="sheet-explain">
         Wajib mengisi alasan mengapa prospek tidak lanjut. Tindakan aktif akan dibatalkan (riwayat histori tetap tersimpan).
        </p>
       <select
          className="select"
          value={lostReasonInput}
          onChange={(e) =>setLostReasonInput(e.target.value)}
          aria-label="Alasan tidak lanjut"
          style={{ marginTop: 14 }}
        >
         <option value="">-- Pilih Alasan --</option>
         <option value="Harga terlalu mahal">Harga terlalu mahal</option>
         <option value="Tidak merespon chat">Tidak merespon chat</option>
         <option value="Memilih kompetitor lain">Memilih kompetitor lain</option>
         <option value="Jadwal tidak cocok">Jadwal tidak cocok</option>
         <option value="Batal kebutuhan">Batal kebutuhan</option>
       </select>
       <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
         <button type="button" className="btn btn-secondary" onClick={() =>setShowLostModal(false)}>Batal</button>
         <button
            type="button"
            className="btn btn-accent"
            onClick={handleConfirmLost}
            disabled={!lostReasonInput.trim()}
          >
           Konfirmasi Lost
          </button>
       </div>
     </BottomSheet>

     {/* Enrollment sheet */}
      <BottomSheet open={showEnrollModal} onClose={() =>setShowEnrollModal(false)} labelledBy="enroll-sheet-title">
       <h2 id="enroll-sheet-title" className="sheet-title-lg">Daftarkan ke Program Kelas</h2>
       <p className="sheet-explain">Pilih program edukasi yang akan diberikan kepada peserta {contact.name}.</p>

       {enrollError && (
          <div className="field-error" role="alert" style={{ marginTop: 12 }}>{enrollError}</div>
       )}
        {enrollSuccess && (
          <div style={{ marginTop: 12, padding: '8px 12px', border: '2px solid var(--ink)', font: '600 12px/1.4 var(--font-sans)', background: 'var(--surface-muted)' }}>
           {enrollSuccess}
          </div>
       )}

        {enrollLoading ? (
          <div style={{ marginTop: 14 }}><LoadingRows rows={3} /></div>
       ) : eligiblePrograms.length === 0 ? (
          <div style={{ marginTop: 14, font: '400 12px/1.5 var(--font-sans)', color: 'var(--muted-strong)' }}>
           Tidak ada program kelas yang tersedia.
          </div>
       ) : (
          <div style={{ marginTop: 14, maxHeight: 300, overflowY: 'auto' }}>
           {eligiblePrograms.map((prog) =>{
              const isEnrolled = learningContext?.activeEnrollments.some((e) =>e.programId === prog.programId);
              return (
                <div
                  key={prog.programId}
                  data-testid="eligible-program-row"
                  className="list-row"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, cursor: 'default' }}
                >
                 <div style={{ minWidth: 0 }}>
                   <div style={{ font: '600 13px/1.3 var(--font-sans)' }}>{prog.title}</div>
                   <div style={{ font: '400 11px/1.4 var(--font-sans)', color: 'var(--muted-strong)' }}>
                     {prog.programType} · {prog.pricing}
                    </div>
                 </div>
                 <button
                    type="button"
                    onClick={() =>handleEnrollProgram(prog.programId)}
                    disabled={enrollLoading}
                    className={isEnrolled ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'}
                    style={isEnrolled ? { opacity: 0.55, cursor: 'default' } : undefined}
                  >
                   {isEnrolled ? 'Terdaftar' : 'Daftarkan'}
                  </button>
               </div>
             );
            })}
          </div>
       )}

        <button type="button" className="btn btn-secondary btn-block" style={{ marginTop: 16 }} onClick={() =>setShowEnrollModal(false)}>
         Tutup
        </button>
     </BottomSheet>

     {/* Create booking confirm sheet */}
      <BottomSheet open={showBookingModal} onClose={() =>setShowBookingModal(false)} labelledBy="booking-sheet-title">
       <div id="booking-sheet-title" className="kicker kicker-muted">Booking baru</div>
       <h2 className="sheet-title-lg" style={{ marginTop: 8 }}>Tes STIFIn Personal</h2>
       <p className="sheet-explain">Jadwal diatur 2 hari dari sekarang, lokasi di tempat (on site), status pembayaran belum dibayar.</p>
       <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
         <button type="button" className="btn btn-primary" onClick={handleCreateNewBooking}>
           Konfirmasi Booking
          </button>
         <button type="button" className="btn btn-ghost" onClick={() =>setShowBookingModal(false)}>
           Batal
          </button>
       </div>
     </BottomSheet>

     {/* WhatsApp sheet */}
      {activeWaModal && (
        <WhatsAppBottomSheet
          isOpen={!!activeWaModal}
          contactName={contact.name}
          phoneE164={contact.phoneE164}
          initialDraft={activeWaModal.draft}
          waUrl={activeWaModal.waUrl}
          onClose={() =>setActiveWaModal(null)}
          onConfirmSent={handleConfirmWaSent}
        />
     )}
    </AppShell>
 );
}
