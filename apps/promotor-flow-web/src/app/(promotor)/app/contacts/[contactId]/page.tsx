'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ChevronLeftIcon, ChevronDownIcon, ExternalLinkIcon, WhatsAppIcon, PlusIcon } from '@/components/foundation/icons';
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

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.contactId as string;

  const [contact, setContact] = useState<FlowContact | null>(null);
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

  const loadData = useCallback(async () => {
    if (!contactId) return;
    const c = await contactQueries.getContactDetail(contactId);
    setContact(c);
    if (c) {
      setNotesText(c.notes || '');
      const acts = await nextActionQueries.getContactNextActions(contactId);
      setActions(acts);
      const bks = await bookingQueries.getContactBookings(contactId);
      setBookings(bks);
      const evs = await activityQueries.listActivities(contactId);
      setActivities(evs);

      // PromotorClass Context
      try {
        const int = await promotorClassQueries.getIntegrationState();
        setClassState({ entitlements: int.entitlements, integrationHealth: int.integrationHealth });
        if (int.entitlements.promotorClass && int.integrationHealth.promotorClass === 'AVAILABLE') {
          const lCtx = await promotorClassQueries.getLearningContext(contactId);
          setLearningContext(lCtx);
        } else {
          setLearningContext(null);
        }
      } catch (err) {
        setLearningContext(null);
      }
    }
  }, [contactId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!contact) {
    return (
      <AppShell showBottomNav={true}>
        <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '14px', fontWeight: 600 }}>
          Memuat kontak...
        </div>
      </AppShell>
    );
  }

  const primaryAction = actions.find((a) => a.status === 'PENDING');
  const activeBooking = bookings.find((b) => b.status === 'CONFIRMED' || b.status === 'PENDING');

  const handleStageSelect = async (newStage: LifecycleStage) => {
    setShowStageModal(false);
    if (newStage === 'LOST') {
      setShowLostModal(true);
      return;
    }
    await lifecycleCommands.changeStage(contactId, newStage);
    loadData();
  };

  const handleConfirmLost = async () => {
    if (!lostReasonInput.trim()) return;
    await lifecycleCommands.changeStage(contactId, 'LOST', lostReasonInput.trim());
    setShowLostModal(false);
    loadData();
  };

  const handleOpenWaForAction = async () => {
    if (!primaryAction) return;
    const draft = await messagingQueries.generateDraftMessage(
      primaryAction.actionType,
      contact.name,
      { serviceTitle: primaryAction.title }
    );
    const waUrl = messagingQueries.buildWhatsAppUrl(contact.phoneE164, draft);
    setActiveWaModal({ draft, waUrl });
  };

  const handleConfirmWaSent = async (scheduleNextDays?: number) => {
    if (!primaryAction || !activeWaModal) return;
    await messagingCommands.confirmWhatsAppSent({
      contactId: contact?.id || contactId,
      actionId: primaryAction.id,
      messageText: activeWaModal.draft,
      scheduleNextFollowUpDays: scheduleNextDays,
    });
    setActiveWaModal(null);
    await loadData();
  };

  const handleCreateNewBooking = async () => {
    const start = clock.addDays(clock.now(), 2);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    await bookingCommands.createBooking({
      contactId: contact?.id || contactId,
      serviceId: 'srv_tes_personal',
      serviceTitle: 'Tes STIFIn Personal',
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      locationType: 'ON_SITE',
      paymentStatus: 'UNPAID',
      amount: 600000,
    });
    setShowBookingModal(false);
    await loadData();
  };

  const handleConfirmBooking = async () => {
    if (!activeBooking) return;
    await bookingCommands.confirmBooking(activeBooking.id);
    await loadData();
  };

  const handleMarkPaid = async () => {
    if (!activeBooking) return;
    await bookingCommands.changePaymentStatus(activeBooking.id, 'PAID');
    await loadData();
  };

  const handleOpenEnrollModal = async () => {
    setEnrollError(null);
    setEnrollSuccess(null);
    setShowEnrollModal(true);
    setEnrollLoading(true);
    try {
      const progs = await promotorClassQueries.listEligiblePrograms({
        organizationId: contact?.organizationId || '',
        contactId,
      });
      setEligiblePrograms(progs);
    } catch (err: any) {
      setEnrollError(err?.message || 'Gagal memuat daftar program.');
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleEnrollProgram = async (programId: string) => {
    setEnrollError(null);
    setEnrollSuccess(null);
    const existing = learningContext?.activeEnrollments.find((e) => e.programId === programId);
    if (existing) {
      setEnrollError('Peserta sudah terdaftar dalam program ini (duplikat dicegah).');
      return;
    }

    setEnrollLoading(true);
    try {
      await promotorClassCommands.enrollContact({
        organizationId: contact?.organizationId || '',
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

  const handleCompleteActiveBooking = async () => {
    if (!activeBooking) return;
    await bookingCommands.completeBooking(activeBooking.id);
    await loadData();
  };

  const handleSaveNotes = async () => {
    await contactCommands.updateContactIdentity(contactId, { notes: notesText });
    setIsEditingNotes(false);
    await loadData();
  };

  return (
    <AppShell showBottomNav={true}>
      <div style={{ backgroundColor: 'var(--color-canvas)', minHeight: '100vh', paddingBottom: '32px' }}>
        {/* Top Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-divider)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <button
            onClick={() => router.back()}
            aria-label="Kembali"
            className="touch-target"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-primary)',
              backgroundColor: 'var(--color-surface-hover)',
              border: '1px solid var(--color-divider)',
            }}
          >
            <ChevronLeftIcon size={18} />
          </button>
          <div style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--color-text-primary)' }}>Detail Kontak</div>
          <div style={{ width: '38px' }} />
        </div>

        {/* Identity Header Card */}
        <div style={{ padding: '16px 16px 0' }}>
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-divider)',
              padding: '20px',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <h1 style={{ fontSize: '22px', fontWeight: 850, letterSpacing: '-0.03em', color: 'var(--color-text-primary)' }}>
              {contact.name}
            </h1>
            <div className="tabular-nums" style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', marginTop: '2px', fontWeight: 550 }}>
              {formatPhoneDisplay(contact.phoneE164)}
            </div>

            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setShowStageModal(true)}
                className="touch-target"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: contact.stage === 'LOST' ? 'var(--color-danger-soft)' : 'var(--color-primary-light)',
                  border: contact.stage === 'LOST' ? '1px solid var(--color-danger-border)' : '1px solid var(--color-primary-border)',
                  color: contact.stage === 'LOST' ? 'var(--color-danger)' : 'var(--color-primary)',
                  fontWeight: 780,
                  fontSize: '12.5px',
                }}
              >
                <span>{contact.stage}</span>
                <ChevronDownIcon size={12} color="currentColor" />
              </button>
              <span style={{ fontSize: '12.5px', color: 'var(--color-text-tertiary)' }}>
                · {contact.sourceChannel || 'Lead'}
              </span>
            </div>
          </div>
        </div>

        {/* Next Action Section */}
        <section style={{ padding: '20px 16px 0' }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '10px' }}>
            Tindakan Berikutnya
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-divider)',
              padding: '18px',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            {primaryAction ? (
              <div>
                <div style={{ fontWeight: 800, fontSize: '15.5px', color: 'var(--color-text-primary)' }}>
                  {primaryAction.title}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '3px' }}>
                  {primaryAction.subtitle || `Jatuh tempo: ${clock.formatDayDate(primaryAction.dueAt)}`}
                </div>

                <button
                  onClick={handleOpenWaForAction}
                  className="touch-target-primary"
                  style={{
                    width: '100%',
                    marginTop: '14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#25D366',
                    color: '#FFFFFF',
                    fontWeight: 780,
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  <WhatsAppIcon size={18} color="#FFFFFF" />
                  <span>Kirim WhatsApp</span>
                </button>

                <div style={{ display: 'flex', gap: '16px', paddingTop: '12px' }}>
                  <button
                    onClick={async () => {
                      const tomorrow = clock.addDays(clock.now(), 1).toISOString();
                      await nextActionCommands.rescheduleNextAction(primaryAction.id, tomorrow);
                      loadData();
                    }}
                    style={{ background: 'none', border: 'none', padding: '4px 0', fontWeight: 680, fontSize: '13px', color: 'var(--color-primary)' }}
                  >
                    Atur ulang jadwal
                  </button>
                  <button
                    onClick={async () => {
                      const tomorrow = clock.addDays(clock.now(), 1).toISOString();
                      await nextActionCommands.skipNextAction(primaryAction.id, {
                        type: 'FOLLOW_UP',
                        title: 'Follow-up prospek',
                        dueAt: tomorrow,
                      });
                      loadData();
                    }}
                    style={{ background: 'none', border: 'none', padding: '4px 0', fontWeight: 600, fontSize: '13px', color: 'var(--color-text-tertiary)' }}
                  >
                    Lewati tindakan
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Belum ada tindakan aktif.</span>
                <button
                  onClick={async () => {
                    await nextActionCommands.scheduleNextAction({
                      contactId: contact.id,
                      actionType: 'FOLLOW_UP',
                      title: 'Follow-up prospek',
                      dueAt: clock.addDays(clock.now(), 1).toISOString(),
                    });
                    loadData();
                  }}
                  className="touch-target"
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                    fontWeight: 780,
                    fontSize: '13px',
                    border: '1px solid var(--color-primary-border)',
                  }}
                >
                  + Tambah Tindakan
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Booking Section */}
        <section style={{ padding: '20px 16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Booking & Sesi Konsultasi
            </h2>
            {!activeBooking && (
              <button
                onClick={handleCreateNewBooking}
                style={{ background: 'none', border: 'none', fontWeight: 750, fontSize: '13px', color: 'var(--color-primary)' }}
              >
                + Buat Booking
              </button>
            )}
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-divider)',
              padding: '18px',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            {activeBooking ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-text-primary)' }}>
                    {activeBooking.serviceTitle}
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 780,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: activeBooking.status === 'CONFIRMED' ? 'var(--color-success-soft)' : 'var(--color-warning-soft)',
                      color: activeBooking.status === 'CONFIRMED' ? 'var(--color-success)' : 'var(--color-warning)',
                    }}
                  >
                    {activeBooking.status}
                  </span>
                </div>

                <div className="tabular-nums" style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  Jadwal: {clock.formatDayDate(activeBooking.startAt)} · {clock.formatTime(activeBooking.startAt)}
                </div>

                <div style={{ fontSize: '12.5px', color: activeBooking.paymentStatus === 'PAID' ? 'var(--color-success)' : 'var(--color-warning)', fontWeight: 700 }}>
                  Pembayaran: {activeBooking.paymentStatus === 'PAID' ? 'Lunas (PAID)' : 'Belum Lunas (UNPAID)'}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {activeBooking.status === 'PENDING' && (
                    <button
                      onClick={handleConfirmBooking}
                      className="touch-target"
                      style={{
                        flex: 1,
                        backgroundColor: 'var(--color-primary)',
                        color: '#FFFFFF',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 780,
                        fontSize: '13px',
                      }}
                    >
                      Konfirmasi Booking
                    </button>
                  )}
                  {activeBooking.paymentStatus === 'UNPAID' && (
                    <button
                      onClick={handleMarkPaid}
                      className="touch-target"
                      style={{
                        flex: 1,
                        backgroundColor: 'var(--color-success)',
                        color: '#FFFFFF',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 780,
                        fontSize: '13px',
                      }}
                    >
                      Tandai Lunas
                    </button>
                  )}
                  <button
                    onClick={handleCompleteActiveBooking}
                    className="touch-target"
                    style={{
                      flex: 1,
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border-strong)',
                      color: 'var(--color-text-primary)',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 700,
                      fontSize: '13px',
                    }}
                  >
                    Tandai Selesai
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '12px 0' }}>
                Belum ada jadwal konsultasi atau booking aktif.
              </div>
            )}
          </div>
        </section>

        {/* PromotorClass Learning Context Section */}
        {classState?.entitlements.promotorClass && (
          <section style={{ padding: '20px 16px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                Aktivitas Belajar (PromotorClass)
              </h2>
              <button
                onClick={handleOpenEnrollModal}
                style={{ background: 'none', border: 'none', fontWeight: 750, fontSize: '13px', color: 'var(--color-primary)' }}
              >
                + Daftarkan ke Kelas
              </button>
            </div>

            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-divider)',
                padding: '18px',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              {classState.integrationHealth.promotorClass === 'UNAVAILABLE' ? (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-warning-soft)',
                    border: '1px solid var(--color-warning-border)',
                    color: 'var(--color-warning)',
                    fontSize: '13px',
                  }}
                >
                  Integrasi PromotorClass sedang dalam mode terdegradasi. Fungsi utama CRM Flow tetap berjalan normal.
                </div>
              ) : learningContext && learningContext.activeEnrollments.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {learningContext.activeEnrollments.map((enr: LearningContext['activeEnrollments'][number]) => (
                    <div
                      key={enr.enrollmentId}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-divider)',
                        backgroundColor: 'var(--color-canvas)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '14.5px', color: 'var(--color-text-primary)' }}>
                        {enr.programTitle}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="tabular-nums" style={{ fontWeight: 780, fontSize: '13px', color: 'var(--color-primary)' }}>
                          Progres: {enr.progressPercent}%
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 750,
                            padding: '2px 7px',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: enr.intentLabel === 'hot' ? 'var(--color-danger-soft)' : 'var(--color-primary-light)',
                            color: enr.intentLabel === 'hot' ? 'var(--color-danger)' : 'var(--color-primary)',
                          }}
                        >
                          {enr.intentLabel === 'hot' ? 'Minat tinggi' : enr.intentLabel === 'warm' ? 'Minat sedang' : 'Minat rendah'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '8px 0' }}>
                  Peserta belum terdaftar di program edukasi PromotorClass.
                </div>
              )}
            </div>
          </section>
        )}

        {/* Notes Section */}
        <section style={{ padding: '20px 16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Catatan Prospek
            </h2>
            {!isEditingNotes && (
              <button
                onClick={() => setIsEditingNotes(true)}
                style={{ background: 'none', border: 'none', fontWeight: 750, fontSize: '13px', color: 'var(--color-primary)' }}
              >
                Edit Catatan
              </button>
            )}
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-divider)',
              padding: '18px',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            {!isEditingNotes ? (
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {contact.notes || 'Belum ada catatan untuk kontak ini.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border-strong)',
                    fontSize: '14px',
                    color: 'var(--color-text-primary)',
                    outline: 'none',
                    backgroundColor: 'var(--color-canvas)',
                  }}
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={handleSaveNotes}
                    className="touch-target"
                    style={{
                      padding: '8px 18px',
                      backgroundColor: 'var(--color-primary)',
                      color: '#FFF',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 780,
                      fontSize: '13px',
                    }}
                  >
                    Simpan Catatan
                  </button>
                  <button
                    onClick={() => setIsEditingNotes(false)}
                    className="touch-target"
                    style={{
                      padding: '8px 14px',
                      backgroundColor: 'transparent',
                      color: 'var(--color-text-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-divider)',
                      fontWeight: 650,
                      fontSize: '13px',
                    }}
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Activity Timeline Section */}
        <section style={{ padding: '20px 16px 0' }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '10px' }}>
            Riwayat Aktivitas
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-divider)',
              padding: '18px',
              boxShadow: 'var(--shadow-xs)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {activities.length > 0 ? (
              activities.map((ev) => (
                <div key={ev.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 650, color: 'var(--color-text-tertiary)', width: '60px', flexShrink: 0 }}>
                    {clock.formatDayDate(ev.timestamp).split(',')[1] || 'Hari ini'}
                  </span>
                  <span style={{ fontSize: '13.5px', color: 'var(--color-text-primary)', lineHeight: 1.45 }}>
                    <strong>{ev.title}</strong> {ev.detail ? `— ${ev.detail}` : ''}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                Belum ada riwayat aktivitas yang tercatat.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Stage Selection Modal */}
      {showStageModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(20,22,21,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '360px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '17px', color: 'var(--color-text-primary)' }}>
              Ubah Tahap Pipeline
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(['NEW', 'CONTACTED', 'INTERESTED', 'FOLLOW_UP', 'BOOKED', 'COMPLETED', 'LOST'] as LifecycleStage[]).map((stg) => (
                <button
                  key={stg}
                  onClick={() => handleStageSelect(stg)}
                  className="touch-target"
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: contact.stage === stg ? '1.5px solid var(--color-primary)' : '1px solid var(--color-divider)',
                    backgroundColor: contact.stage === stg ? 'var(--color-primary-light)' : 'var(--color-surface)',
                    color: stg === 'LOST' ? 'var(--color-danger)' : 'var(--color-text-primary)',
                    fontWeight: contact.stage === stg ? 800 : 600,
                    fontSize: '13.5px',
                    textAlign: 'left',
                    justifyContent: 'flex-start',
                  }}
                >
                  {stg}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowStageModal(false)}
              className="touch-target"
              style={{
                color: 'var(--color-text-secondary)',
                fontWeight: 650,
                fontSize: '13.5px',
              }}
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Lost Reason Modal */}
      {showLostModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(20,22,21,0.5)', zIndex: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '380px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '17px', color: 'var(--color-danger)' }}>
              Alasan Tidak Lanjut (Lost Reason)
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Wajib memilih alasan mengapa prospek ini tidak lanjut. Tindakan aktif akan dibatalkan otomatis namun riwayat tetap tercatat.
            </div>
            <select
              value={lostReasonInput}
              onChange={(e) => setLostReasonInput(e.target.value)}
              style={{
                height: '44px',
                padding: '0 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-strong)',
                fontSize: '14px',
                color: 'var(--color-text-primary)',
                backgroundColor: 'var(--color-canvas)',
                outline: 'none',
              }}
            >
              <option value="">-- Pilih Alasan --</option>
              <option value="Harga terlalu mahal">Harga terlalu mahal</option>
              <option value="Tidak merespon chat">Tidak merespon chat</option>
              <option value="Memilih kompetitor lain">Memilih kompetitor lain</option>
              <option value="Jadwal tidak cocok">Jadwal tidak cocok</option>
              <option value="Batal kebutuhan">Batal kebutuhan</option>
            </select>
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                onClick={() => setShowLostModal(false)}
                className="touch-target"
                style={{
                  flex: 1,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-strong)',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 650,
                  fontSize: '13.5px',
                }}
              >
                Batal
              </button>
              <button
                onClick={handleConfirmLost}
                disabled={!lostReasonInput.trim()}
                className="touch-target"
                style={{
                  flex: 1,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: lostReasonInput.trim() ? 'var(--color-danger)' : 'var(--color-border-strong)',
                  color: '#FFFFFF',
                  fontWeight: 780,
                  fontSize: '13.5px',
                }}
              >
                Konfirmasi Lost
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PromotorClass Enrollment Modal */}
      {showEnrollModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(20,22,21,0.5)', zIndex: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '440px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '17px', color: 'var(--color-text-primary)' }}>
              Daftarkan ke Program Kelas
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Pilih program edukasi untuk peserta <strong>{contact.name}</strong>.
            </div>

            {enrollError && (
              <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-danger-soft)', border: '1px solid var(--color-danger-border)', color: 'var(--color-danger)', fontSize: '13px' }}>
                {enrollError}
              </div>
            )}

            {enrollSuccess && (
              <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-success-soft)', border: '1px solid var(--color-success-border)', color: 'var(--color-success)', fontSize: '13px' }}>
                {enrollSuccess}
              </div>
            )}

            {enrollLoading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '13px' }}>Memuat program...</div>
            ) : eligiblePrograms.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '13px' }}>Tidak ada program kelas yang tersedia.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                {eligiblePrograms.map((prog) => {
                  const isEnrolled = learningContext?.activeEnrollments.some((e) => e.programId === prog.programId);
                  return (
                    <div
                      key={prog.programId}
                      data-testid="eligible-program-row"
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-divider)',
                        backgroundColor: 'var(--color-canvas)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--color-text-primary)' }}>{prog.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                          {prog.programType} · {prog.pricing}
                        </div>
                      </div>
                      <button
                        onClick={() => handleEnrollProgram(prog.programId)}
                        disabled={enrollLoading}
                        className="touch-target"
                        style={{
                          padding: '6px 14px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: isEnrolled ? 'var(--color-surface-hover)' : 'var(--color-primary)',
                          color: isEnrolled ? 'var(--color-text-tertiary)' : '#FFFFFF',
                          fontWeight: 780,
                          fontSize: '12.5px',
                          border: 'none',
                          cursor: isEnrolled ? 'default' : 'pointer',
                        }}
                      >
                        {isEnrolled ? 'Terdaftar' : 'Daftarkan'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => setShowEnrollModal(false)}
              className="touch-target"
              style={{
                marginTop: '4px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-strong)',
                color: 'var(--color-text-secondary)',
                fontWeight: 650,
                fontSize: '13.5px',
              }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {activeWaModal && (
        <WhatsAppBottomSheet
          isOpen={!!activeWaModal}
          contactName={contact.name}
          phoneE164={contact.phoneE164}
          initialDraft={activeWaModal.draft}
          waUrl={activeWaModal.waUrl}
          onClose={() => setActiveWaModal(null)}
          onConfirmSent={handleConfirmWaSent}
        />
      )}
    </AppShell>
  );
}
