'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ChevronLeftIcon, ChevronDownIcon, ExternalLinkIcon } from '@/components/foundation/icons';
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
  store,
  clock,
} from '@/lib/container';
import { FlowContact, FlowNextAction, FlowBooking, FlowActivity, LifecycleStage } from '@promotor/promotor-flow-fixtures';
import { formatPhoneDisplay } from '@promotor/platform-core';
import { ProductEntitlements, LearningContext } from '@promotor/contracts';
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
    const unsubscribe = store.subscribe(() => loadData());
    return () => unsubscribe();
  }, [loadData]);

  if (!contact) {
    return (
      <AppShell showBottomNav={true}>
        <div style={{ padding: '32px 16px', textAlign: 'center', color: '#71706B' }}>Memuat kontak...</div>
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
      contactId: contact.id,
      actionId: primaryAction.id,
      messageText: activeWaModal.draft,
      scheduleNextFollowUpDays: scheduleNextDays,
    });
    setActiveWaModal(null);
    loadData();
  };

  const handleCreateNewBooking = async () => {
    await bookingCommands.createBooking({
      contactId: contact.id,
      serviceId: 'srv_tes_personal',
      serviceTitle: 'Tes STIFIn Personal',
      startAt: clock.addDays(clock.now(), 2).toISOString(),
      endAt: clock.addDays(clock.now(), 2).toISOString(),
      locationType: 'ON_SITE',
      paymentStatus: 'UNPAID',
      amount: 600000,
    });
    setShowBookingModal(false);
    loadData();
  };

  const handleCompleteActiveBooking = async () => {
    if (!activeBooking) return;
    await bookingCommands.completeBooking(activeBooking.id);
    loadData();
  };

  const handleSaveNotes = async () => {
    await contactCommands.updateContactIdentity(contactId, { notes: notesText });
    setIsEditingNotes(false);
    loadData();
  };

  return (
    <AppShell showBottomNav={true}>
      <div style={{ backgroundColor: '#FFFFFF', minHeight: '100vh', paddingBottom: '32px' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px' }}>
          <button
            onClick={() => router.back()}
            aria-label="Kembali"
            style={{
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              color: '#191918',
            }}
          >
            <ChevronLeftIcon size={20} />
          </button>
          <div style={{ font: '600 14px Inter, sans-serif', color: '#71706B' }}>Detail Kontak</div>
          <div style={{ width: '44px' }}></div>
        </div>

        {/* Identity Header */}
        <div style={{ padding: '4px 16px 0' }}>
          <h1 style={{ font: '700 22px/28px Inter, sans-serif', color: '#191918' }}>{contact.name}</h1>
          <div style={{ font: '400 14px/20px Inter, sans-serif', color: '#71706B', paddingTop: '2px' }}>
            {formatPhoneDisplay(contact.phoneE164)}
          </div>

          <button
            onClick={() => setShowStageModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              height: '44px',
              margin: '4px -6px 0',
              padding: '0 6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: contact.stage === 'COMPLETED' ? '#067647' : contact.stage === 'LOST' ? '#B42318' : '#167A68',
              }}
            />
            <span style={{ font: '600 13.5px Inter, sans-serif', color: '#191918' }}>{contact.stage}</span>
            <span style={{ font: '400 13.5px Inter, sans-serif', color: '#71706B' }}>
              · {contact.sourceChannel || 'Lead'}
            </span>
            <ChevronDownIcon size={13} color="#9C9A94" />
          </button>
        </div>

        {/* Next Action Section */}
        <div style={{ font: '600 11px/16px Inter, sans-serif', letterSpacing: '.07em', color: '#9C9A94', textTransform: 'uppercase', padding: '28px 16px 8px' }}>
          Tindakan berikutnya
        </div>
        <div style={{ padding: '0 16px' }}>
          {primaryAction ? (
            <div>
              <div style={{ font: '600 15.5px/21px Inter, sans-serif', color: '#191918' }}>{primaryAction.title}</div>
              <div style={{ font: '400 13.5px/19px Inter, sans-serif', color: '#71706B', paddingTop: '2px' }}>
                {primaryAction.subtitle || `Jatuh tempo: ${clock.formatDayDate(primaryAction.dueAt)}`}
              </div>
              <button
                onClick={handleOpenWaForAction}
                style={{
                  width: '100%',
                  height: '46px',
                  marginTop: '14px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#167A68',
                  color: '#FFFFFF',
                  font: '600 15px Inter, sans-serif',
                }}
              >
                Buka WhatsApp
              </button>
              <div style={{ display: 'flex', gap: '20px', paddingTop: '12px' }}>
                <button
                  onClick={async () => {
                    const tomorrow = clock.addDays(clock.now(), 1).toISOString();
                    await nextActionCommands.rescheduleNextAction(primaryAction.id, tomorrow);
                    loadData();
                  }}
                  style={{ background: 'none', border: 'none', padding: '4px 0', font: '500 14px Inter, sans-serif', color: '#167A68' }}
                >
                  Atur ulang
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
                  style={{ background: 'none', border: 'none', padding: '4px 0', font: '500 14px Inter, sans-serif', color: '#71706B' }}
                >
                  Lewati tindakan ini
                </button>
              </div>
            </div>
          ) : (
            <div style={{ font: '400 14px/20px Inter, sans-serif', color: '#71706B' }}>
              Belum ada tindakan aktif.{' '}
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
                style={{ background: 'none', border: 'none', font: '500 14px Inter, sans-serif', color: '#167A68' }}
              >
                + Tambah tindakan
              </button>
            </div>
          )}
        </div>

        {/* Booking Section */}
        <div style={{ font: '600 11px/16px Inter, sans-serif', letterSpacing: '.07em', color: '#9C9A94', textTransform: 'uppercase', padding: '28px 16px 8px' }}>
          Booking
        </div>
        <div style={{ padding: '0 16px' }}>
          {activeBooking ? (
            <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #E8E7E3', backgroundColor: '#F7F7F5', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ font: '600 14.5px Inter, sans-serif', color: '#191918' }}>{activeBooking.serviceTitle}</div>
              <div style={{ font: '400 13px Inter, sans-serif', color: '#71706B' }}>
                Jadwal: {clock.formatDayDate(activeBooking.startAt)} {clock.formatTime(activeBooking.startAt)}
              </div>
              <div style={{ font: '500 13px Inter, sans-serif', color: activeBooking.paymentStatus === 'PAID' ? '#067647' : '#B54708' }}>
                Status Pembayaran: {activeBooking.paymentStatus}
              </div>
              <button
                onClick={handleCompleteActiveBooking}
                style={{
                  marginTop: '6px',
                  height: '36px',
                  backgroundColor: '#067647',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  border: 'none',
                  font: '600 13px Inter, sans-serif',
                }}
              >
                Tandai Layanan Selesai
              </button>
            </div>
          ) : (
            <div>
              <div style={{ font: '400 14px/20px Inter, sans-serif', color: '#71706B' }}>Belum ada booking aktif.</div>
              <button
                onClick={handleCreateNewBooking}
                style={{ background: 'none', border: 'none', padding: '8px 0 0', font: '500 14px Inter, sans-serif', color: '#167A68' }}
              >
                + Buat booking
              </button>
            </div>
          )}
        </div>

        {/* PromotorClass Learning Section */}
        {classState?.entitlements.promotorClass && (
          <>
            <div style={{ font: '600 11px/16px Inter, sans-serif', letterSpacing: '.07em', color: '#9C9A94', textTransform: 'uppercase', padding: '28px 16px 8px' }}>
              Aktivitas Belajar (PromotorClass)
            </div>
            <div style={{ padding: '0 16px' }}>
              {classState.integrationHealth.promotorClass === 'UNAVAILABLE' ? (
                <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: '#FFFAEB', border: '1px solid #B54708', color: '#B54708', font: '400 13px Inter, sans-serif' }}>
                  Integrasi PromotorClass sedang tidak tersedia (degraded mode). Fungsi utama Flow tetap berjalan.
                </div>
              ) : learningContext && learningContext.activeEnrollments.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {learningContext.activeEnrollments.map((enr: LearningContext['activeEnrollments'][number]) => (
                    <div
                      key={enr.enrollmentId}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #E8E7E3',
                        backgroundColor: '#FFFFFF',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ font: '600 14.5px Inter, sans-serif', color: '#191918' }}>{enr.programTitle}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ font: '600 13px Inter, sans-serif', color: '#167A68' }}>{enr.progressPercent}%</span>
                        <span style={{ font: '500 12.5px Inter, sans-serif', color: '#71706B' }}>
                          · {enr.intentLabel === 'hot' ? 'Minat tinggi' : enr.intentLabel === 'warm' ? 'Minat sedang' : 'Minat rendah'}
                        </span>
                      </div>
                      <button
                        onClick={() => alert(`Navigasi ke PromotorClass Learner Detail: /learners/${contact.id}`)}
                        style={{
                          marginTop: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          font: '500 13px Inter, sans-serif',
                          color: '#167A68',
                        }}
                      >
                        <span>Lihat aktivitas belajar</span>
                        <ExternalLinkIcon size={12} color="#167A68" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ font: '400 14px Inter, sans-serif', color: '#71706B' }}>
                  Belum ada enrollment aktif di PromotorClass.
                </div>
              )}
            </div>
          </>
        )}

        {/* Notes Section */}
        <div style={{ font: '600 11px/16px Inter, sans-serif', letterSpacing: '.07em', color: '#9C9A94', textTransform: 'uppercase', padding: '28px 16px 8px' }}>
          Catatan
        </div>
        <div style={{ padding: '0 16px' }}>
          {!isEditingNotes ? (
            <div>
              <div style={{ font: '400 14px/21px Inter, sans-serif', color: '#191918', whiteSpace: 'pre-wrap' }}>
                {contact.notes || 'Belum ada catatan.'}
              </div>
              <button
                onClick={() => setIsEditingNotes(true)}
                style={{ background: 'none', border: 'none', padding: '8px 0 0', font: '500 14px Inter, sans-serif', color: '#167A68' }}
              >
                Edit catatan
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #D5D3CE',
                  font: '400 14px Inter, sans-serif',
                }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleSaveNotes}
                  style={{
                    height: '36px',
                    padding: '0 16px',
                    backgroundColor: '#167A68',
                    color: '#FFF',
                    borderRadius: '6px',
                    border: 'none',
                    font: '600 13px Inter, sans-serif',
                  }}
                >
                  Simpan
                </button>
                <button
                  onClick={() => setIsEditingNotes(false)}
                  style={{
                    height: '36px',
                    padding: '0 16px',
                    backgroundColor: 'transparent',
                    color: '#71706B',
                    borderRadius: '6px',
                    border: '1px solid #D5D3CE',
                    font: '500 13px Inter, sans-serif',
                  }}
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Activity Timeline Section */}
        <div style={{ font: '600 11px/16px Inter, sans-serif', letterSpacing: '.07em', color: '#9C9A94', textTransform: 'uppercase', padding: '28px 16px 8px' }}>
          Aktivitas
        </div>
        <div style={{ padding: '0 16px 28px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {activities.length > 0 ? (
            activities.map((ev) => (
              <div key={ev.id} style={{ display: 'flex', gap: '14px' }}>
                <span style={{ font: '450 12.5px/18px Inter, sans-serif', color: '#9C9A94', width: '56px', flex: 'none' }}>
                  {clock.formatDayDate(ev.timestamp).split(',')[1] || 'Hari ini'}
                </span>
                <span style={{ font: '400 13.5px/18px Inter, sans-serif', color: '#191918' }}>
                  {ev.title} {ev.detail ? `— ${ev.detail}` : ''}
                </span>
              </div>
            ))
          ) : (
            <div style={{ font: '400 13.5px Inter, sans-serif', color: '#71706B' }}>Belum ada riwayat aktivitas.</div>
          )}
        </div>
      </div>

      {/* Stage Selection Modal */}
      {showStageModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: '12px', width: '100%', maxWidth: '360px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ font: '600 16px Inter, sans-serif', color: '#191918' }}>Ubah Tahap Lifecycle</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(['NEW', 'CONTACTED', 'INTERESTED', 'FOLLOW_UP', 'BOOKED', 'COMPLETED', 'LOST'] as LifecycleStage[]).map((stg) => (
                <button
                  key={stg}
                  onClick={() => handleStageSelect(stg)}
                  style={{
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: contact.stage === stg ? '2px solid #167A68' : '1px solid #E8E7E3',
                    backgroundColor: contact.stage === stg ? '#EAF5F2' : '#FFFFFF',
                    color: stg === 'LOST' ? '#B42318' : '#191918',
                    font: '500 14px Inter, sans-serif',
                    textAlign: 'left',
                  }}
                >
                  {stg}
                </button>
              ))}
            </div>
            <button onClick={() => setShowStageModal(false)} style={{ height: '40px', border: 'none', background: 'none', color: '#71706B', font: '500 14px Inter, sans-serif' }}>
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Lost Reason Modal (Required when stage === LOST) */}
      {showLostModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: '12px', width: '100%', maxWidth: '380px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ font: '600 16px Inter, sans-serif', color: '#B42318' }}>Alasan Tidak Lanjut (Lost Reason)</div>
            <div style={{ font: '400 13.5px Inter, sans-serif', color: '#71706B' }}>
              Wajib mengisi alasan mengapa prospek tidak lanjut. Tindakan aktif akan dibatalkan (riwayat histori tetap tersimpan).
            </div>
            <select
              value={lostReasonInput}
              onChange={(e) => setLostReasonInput(e.target.value)}
              style={{ height: '40px', padding: '0 10px', borderRadius: '6px', border: '1px solid #D5D3CE', font: '400 14px Inter, sans-serif' }}
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
                style={{ flex: 1, height: '40px', border: '1px solid #D5D3CE', borderRadius: '6px', backgroundColor: '#FFF', color: '#71706B', font: '500 14px Inter, sans-serif' }}
              >
                Batal
              </button>
              <button
                onClick={handleConfirmLost}
                disabled={!lostReasonInput.trim()}
                style={{ flex: 1, height: '40px', border: 'none', borderRadius: '6px', backgroundColor: lostReasonInput.trim() ? '#B42318' : '#D5D3CE', color: '#FFF', font: '600 14px Inter, sans-serif' }}
              >
                Konfirmasi Lost
              </button>
            </div>
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
