import { Contact } from '@promotor/contracts';

export const SEED_ORGANIZATION = {
  id: 'org_rina_stifin',
  name: 'Rina Parenting & STIFIn Center',
  slug: 'rina',
  timezone: 'Asia/Jakarta',
  createdAt: '2026-01-01T00:00:00Z',
};

export type LifecycleStage =
  | 'NEW'
  | 'CONTACTED'
  | 'INTERESTED'
  | 'FOLLOW_UP'
  | 'BOOKED'
  | 'COMPLETED'
  | 'LOST';

export type ContactClassification = 'PROSPECT' | 'CLIENT';

export interface FlowContact extends Contact {
  stage: LifecycleStage;
  classification: ContactClassification;
  sourceChannel?: string;
  notes?: string;
  lostReason?: string;
  tags?: string[];
  updatedAt: string;
}

export type ServiceCategory = 'ASSESSMENT' | 'SESSION' | 'PROGRAM' | 'OTHER';

export interface FlowService {
  id: string;
  organizationId: string;
  title: string;
  category: ServiceCategory;
  priceAmount: number;
  durationMinutes: number;
  description?: string;
  isActive: boolean;
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type PaymentStatus = 'UNPAID' | 'PAID' | 'WAIVED';

export interface FlowBooking {
  id: string;
  organizationId: string;
  contactId: string;
  serviceId: string;
  serviceTitle: string;
  startAt: string;
  endAt: string;
  locationType: 'HOME_VISIT' | 'ON_SITE' | 'ONLINE';
  locationAddress?: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  amount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type NextActionType =
  | 'CONTACT_LEAD'
  | 'FOLLOW_UP'
  | 'REMIND_PAYMENT'
  | 'CONFIRM_BOOKING'
  | 'REMIND_BOOKING'
  | 'AFTERCARE'
  | 'MANUAL';

export type NextActionStatus = 'PENDING' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED';

export type ActionSource = 'PROMOTORFLOW' | 'PROMOTORCLASS' | 'MANUAL';

export interface FlowNextAction {
  id: string;
  organizationId: string;
  contactId: string;
  actionType: NextActionType;
  title: string;
  subtitle?: string;
  dueAt: string;
  status: NextActionStatus;
  source: ActionSource;
  sourceEventId?: string;
  sourceSignalId?: string;
  idempotencyKey?: string;
  contextJson?: Record<string, unknown>;
  createdAt: string;
  completedAt?: string;
}

export interface FlowActivity {
  id: string;
  organizationId: string;
  contactId: string;
  title: string;
  detail?: string;
  timestamp: string;
  type: 'CONTACT_CREATED' | 'STAGE_CHANGED' | 'WA_SENT' | 'BOOKING_CREATED' | 'BOOKING_COMPLETED' | 'AFTERCARE_COMPLETED' | 'NOTE_ADDED' | 'CLASS_SIGNAL';
}

export interface MessageTemplate {
  id: string;
  title: string;
  category: NextActionType;
  templateText: string;
}

// Canonical Contacts: reusing exact IDs contact_ayu, contact_nina, contact_budi from PromotorClass
export const SEED_FLOW_CONTACTS: FlowContact[] = [
  {
    id: 'contact_ayu',
    organizationId: 'org_rina_stifin',
    name: 'Ayu Rahma',
    phoneE164: '+628121110001',
    stage: 'FOLLOW_UP',
    classification: 'PROSPECT',
    sourceChannel: 'Instagram',
    notes: 'Anak kelas 9. Sedang bingung memilih SMA. Tanya jadwal weekend karena kerja Senin–Jumat.',
    tags: ['Parenting', 'Instagram'],
    createdAt: '2026-08-08T09:00:00Z',
    updatedAt: '2026-08-12T10:00:00Z',
  },
  {
    id: 'contact_arief',
    organizationId: 'org_rina_stifin',
    name: 'Arief Santoso',
    phoneE164: '+6281234567890',
    stage: 'BOOKED',
    classification: 'PROSPECT',
    sourceChannel: 'Referral',
    notes: 'Booking Tes Family untuk 4 anggota keluarga.',
    tags: ['Family', 'Home Visit'],
    createdAt: '2026-08-09T11:00:00Z',
    updatedAt: '2026-08-12T12:00:00Z',
  },
  {
    id: 'contact_dimas',
    organizationId: 'org_rina_stifin',
    name: 'Dimas Prakoso',
    phoneE164: '+6281345678901',
    stage: 'BOOKED',
    classification: 'PROSPECT',
    sourceChannel: 'Google',
    notes: 'Jadwal tes Jumat jam 10:00. DP belum ditransfer.',
    tags: ['Personal', 'Google'],
    createdAt: '2026-08-10T14:00:00Z',
    updatedAt: '2026-08-12T08:00:00Z',
  },
  {
    id: 'contact_reni',
    organizationId: 'org_rina_stifin',
    name: 'Reni Wulandari',
    phoneE164: '+6281456789012',
    stage: 'COMPLETED',
    classification: 'CLIENT',
    sourceChannel: 'Instagram',
    notes: 'Tes Personal completed tanggal 5 Agu. Butuh jadwal aftercare.',
    tags: ['Client', 'Personal'],
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-12T09:00:00Z',
  },
  {
    id: 'contact_hendra',
    organizationId: 'org_rina_stifin',
    name: 'Hendra Kusuma',
    phoneE164: '+6281567890123',
    stage: 'NEW',
    classification: 'PROSPECT',
    sourceChannel: 'Google',
    notes: 'Tertarik Tes Couple.',
    tags: ['Couple', 'New Lead'],
    createdAt: '2026-08-12T08:00:00Z',
    updatedAt: '2026-08-12T08:00:00Z',
  },
  {
    id: 'contact_nina',
    organizationId: 'org_rina_stifin',
    name: 'Nina Rahmawati',
    phoneE164: '+6281876543210',
    stage: 'INTERESTED',
    classification: 'PROSPECT',
    sourceChannel: 'Class Program',
    notes: 'Menyelesaikan modul 7 Hari Mengenal Cara Belajar Anak.',
    tags: ['Class', 'Minat tinggi'],
    createdAt: '2026-08-05T14:30:00Z',
    updatedAt: '2026-08-12T08:30:00Z',
  },
  {
    id: 'contact_budi',
    organizationId: 'org_rina_stifin',
    name: 'Budi Santoso',
    phoneE164: '+6281765432109',
    stage: 'CONTACTED',
    classification: 'PROSPECT',
    sourceChannel: 'WhatsApp',
    notes: 'Menanyakan pricelist tes organisasi.',
    tags: ['Corporate'],
    createdAt: '2026-08-08T09:15:00Z',
    updatedAt: '2026-08-10T10:00:00Z',
  },
];

export const SEED_SERVICES: FlowService[] = [
  {
    id: 'srv_tes_personal',
    organizationId: 'org_rina_stifin',
    title: 'Tes STIFIn Personal',
    category: 'ASSESSMENT',
    priceAmount: 600000,
    durationMinutes: 60,
    description: 'Tes pemetaan mesin kecerdasan 1 orang meliputi biometrik dan sesi penjelasan hasil.',
    isActive: true,
  },
  {
    id: 'srv_tes_family',
    organizationId: 'org_rina_stifin',
    title: 'Tes STIFIn Family ( Paket 4 Orang )',
    category: 'ASSESSMENT',
    priceAmount: 2000000,
    durationMinutes: 120,
    description: 'Tes pemetaan keluarga dan analisis dinamika hubungan orang tua - anak.',
    isActive: true,
  },
  {
    id: 'srv_tes_couple',
    organizationId: 'org_rina_stifin',
    title: 'Tes STIFIn Couple',
    category: 'ASSESSMENT',
    priceAmount: 1200000,
    durationMinutes: 90,
    description: 'Tes keselarasan pasangan dan pola komunikasi.',
    isActive: true,
  },
  {
    id: 'srv_konsultasi',
    organizationId: 'org_rina_stifin',
    title: 'Konsultasi Parenting 1-on-1',
    category: 'SESSION',
    priceAmount: 350000,
    durationMinutes: 60,
    description: 'Sesi pendampingan penerapan hasil tes dalam belajar & pengasuhan anak.',
    isActive: true,
  },
];

export const SEED_BOOKINGS: FlowBooking[] = [
  {
    id: 'bk_arief',
    organizationId: 'org_rina_stifin',
    contactId: 'contact_arief',
    serviceId: 'srv_tes_family',
    serviceTitle: 'Tes Family · Home visit',
    startAt: '2026-08-12T14:00:00+07:00',
    endAt: '2026-08-12T16:00:00+07:00',
    locationType: 'HOME_VISIT',
    locationAddress: 'Jl. Merpati No. 12, Jakarta Selatan',
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    amount: 2000000,
    notes: 'Sudah bayar lunas via transfer BCA.',
    createdAt: '2026-08-09T11:00:00Z',
    updatedAt: '2026-08-11T10:00:00Z',
  },
  {
    id: 'bk_dimas',
    organizationId: 'org_rina_stifin',
    contactId: 'contact_dimas',
    serviceId: 'srv_tes_personal',
    serviceTitle: 'Tes Personal · Datang ke lokasi',
    startAt: '2026-08-14T10:00:00+07:00',
    endAt: '2026-08-14T11:00:00+07:00',
    locationType: 'ON_SITE',
    status: 'PENDING',
    paymentStatus: 'UNPAID',
    amount: 600000,
    notes: 'Perlu diingatkan DP sebelum H-1.',
    createdAt: '2026-08-10T14:00:00Z',
    updatedAt: '2026-08-10T14:00:00Z',
  },
  {
    id: 'bk_reni',
    organizationId: 'org_rina_stifin',
    contactId: 'contact_reni',
    serviceId: 'srv_tes_personal',
    serviceTitle: 'Tes Personal',
    startAt: '2026-08-05T10:00:00+07:00',
    endAt: '2026-08-05T11:00:00+07:00',
    locationType: 'ON_SITE',
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    amount: 600000,
    notes: 'Selesai tes dan konsultasi awal.',
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-05T11:30:00Z',
  },
];

export const SEED_NEXT_ACTIONS: FlowNextAction[] = [
  {
    id: 'act_ayu_1',
    organizationId: 'org_rina_stifin',
    contactId: 'contact_ayu',
    actionType: 'FOLLOW_UP',
    title: 'Tanya jadwal weekend',
    subtitle: 'Parenting · Instagram',
    dueAt: '2026-08-11T10:00:00+07:00', // Yesterday (Overdue by 1 day)
    status: 'PENDING',
    source: 'PROMOTORFLOW',
    createdAt: '2026-08-08T10:00:00Z',
  },
  {
    id: 'act_arief_1',
    organizationId: 'org_rina_stifin',
    contactId: 'contact_arief',
    actionType: 'CONFIRM_BOOKING',
    title: 'Tes Family · Home visit',
    subtitle: 'DP sudah dibayar',
    dueAt: '2026-08-12T14:00:00+07:00', // Today 14:00
    status: 'PENDING',
    source: 'PROMOTORFLOW',
    createdAt: '2026-08-09T11:00:00Z',
  },
  {
    id: 'act_dimas_1',
    organizationId: 'org_rina_stifin',
    contactId: 'contact_dimas',
    actionType: 'REMIND_PAYMENT',
    title: 'Tes Personal · Datang ke lokasi',
    subtitle: 'DP belum dibayar',
    dueAt: '2026-08-12T16:00:00+07:00', // Today
    status: 'PENDING',
    source: 'PROMOTORFLOW',
    createdAt: '2026-08-10T14:00:00Z',
  },
  {
    id: 'act_reni_1',
    organizationId: 'org_rina_stifin',
    contactId: 'contact_reni',
    actionType: 'AFTERCARE',
    title: 'Tanya pemahaman hasil',
    subtitle: 'Klien · Tes Personal, 5 Agu',
    dueAt: '2026-08-12T09:00:00+07:00', // Today (D+7 after 5 Aug)
    status: 'PENDING',
    source: 'PROMOTORFLOW',
    createdAt: '2026-08-05T11:30:00Z',
  },
  {
    id: 'act_hendra_1',
    organizationId: 'org_rina_stifin',
    contactId: 'contact_hendra',
    actionType: 'CONTACT_LEAD',
    title: 'Hubungi prospek baru',
    subtitle: 'Tes Couple · Google',
    dueAt: '2026-08-13T09:00:00+07:00', // Tomorrow 09:00
    status: 'PENDING',
    source: 'PROMOTORFLOW',
    createdAt: '2026-08-12T08:00:00Z',
  },
  {
    id: 'act_nina_1',
    organizationId: 'org_rina_stifin',
    contactId: 'contact_nina',
    actionType: 'FOLLOW_UP',
    title: 'Follow-up setelah menyelesaikan Modul 1',
    subtitle: 'Parenting Mini Class · Minat tinggi',
    dueAt: '2026-08-12T11:00:00+07:00',
    status: 'PENDING',
    source: 'PROMOTORCLASS',
    sourceEventId: 'evt_nina_prog_50',
    sourceSignalId: 'sig_nina_hp_conflict',
    idempotencyKey: 'promotorclass:evt_nina_prog_50:followup',
    createdAt: '2026-08-12T08:30:00Z',
  },
];

export const SEED_ACTIVITIES: FlowActivity[] = [
  {
    id: 'act_ayu_ev1',
    organizationId: 'org_rina_stifin',
    contactId: 'contact_ayu',
    title: 'Follow-up jatuh tempo',
    timestamp: '2026-08-12T10:00:00Z',
    type: 'STAGE_CHANGED',
  },
  {
    id: 'act_ayu_ev2',
    organizationId: 'org_rina_stifin',
    contactId: 'contact_ayu',
    title: 'WhatsApp dikirim',
    detail: 'Halo Ayu, mengonfirmasi jadwal konsultasi...',
    timestamp: '2026-08-10T10:00:00Z',
    type: 'WA_SENT',
  },
  {
    id: 'act_ayu_ev3',
    organizationId: 'org_rina_stifin',
    contactId: 'contact_ayu',
    title: 'Menanyakan harga',
    timestamp: '2026-08-08T11:00:00Z',
    type: 'NOTE_ADDED',
  },
  {
    id: 'act_ayu_ev4',
    organizationId: 'org_rina_stifin',
    contactId: 'contact_ayu',
    title: 'Prospek ditambahkan',
    timestamp: '2026-08-08T09:00:00Z',
    type: 'CONTACT_CREATED',
  },
];

export const SEED_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tmpl_lead_followup',
    title: 'Follow-up Prospek Baru',
    category: 'CONTACT_LEAD',
    templateText: 'Halo [Nama], salam kenal dari Mbak Rina (STIFIn Center). Terima kasih sudah bertanya tentang tes STIFIn. Apakah ada yang bisa saya bantu jelaskan terlebih dahulu?',
  },
  {
    id: 'tmpl_booking_confirm',
    title: 'Konfirmasi Booking Tes',
    category: 'CONFIRM_BOOKING',
    templateText: 'Halo [Nama], mengonfirmasi jadwal tes STIFIn Anda pada [Tanggal/Waktu] di [Lokasi]. Mohon beri tahu jika ada penyesuaian jadwal.',
  },
  {
    id: 'tmpl_payment_remind',
    title: 'Pengingat Pembayaran DP',
    category: 'REMIND_PAYMENT',
    templateText: 'Halo [Nama], untuk mengamankan slot tes STIFIn Anda pada [Tanggal], mohon melakukan transfer DP sebesar Rp [Amount] ke rekening BCA 1234567890 a.n. Rina.',
  },
  {
    id: 'tmpl_aftercare',
    title: 'Follow-up Aftercare (D+7)',
    category: 'AFTERCARE',
    templateText: 'Halo [Nama], bagaimana perkembangan dan penerapan hasil tes STIFIn sejauh ini di rumah? Jika ada pertanyaan atau kendala penerapan, silakan ceritakan ya.',
  },
];

export const SEED_TAGS: string[] = [
  'Parenting',
  'Instagram',
  'Google',
  'Referral',
  'Family',
  'Personal',
  'Couple',
  'Home Visit',
  'Client',
  'Minat tinggi',
  'Minat sedang',
];
