import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { contactFlowStates, activities } from '../../db/schema';
import {
  normalizePhone,
  normalizeEmail,
  formatIDR,
  generatePurchaseReference,
  buildPurchaseWhatsAppUrl,
} from '@promotor/platform-core';
import { DomainError } from '../../core/errors';
import { createOrganizationRepository } from '../../repositories/organization-repository';
import { createProgramRepository } from '../../repositories/program-repository';
import { createContactRepository } from '../../repositories/contact-repository';
import { createEnrollmentRepository } from '../../repositories/enrollment-repository';
import { createLearningEventRepository } from '../../repositories/learning-event-repository';
import { createPaymentSettingsRepository, PaymentSettingsRepository } from '../../repositories/payment-settings-repository';
import { createPurchaseRequestRepository, PurchaseRequestRepository } from '../../repositories/purchase-request-repository';
import { createWorkspaceProfileRepository } from '../../repositories/workspace-profile-repository';
import {
  CreatePublicPurchaseRequest,
  CreatePublicPurchaseResponse,
  ProgramPurchaseRequest,
  PublicPaymentInfo,
  PurchaseStatus,
  PurchaseMethod,
  CreateBankAccountRequest,
  UpdateBankAccountRequest,
  OrganizationBankAccount,
  OrganizationPaymentSettings,
} from '@promotor/contracts';

export interface CommerceServiceOptions {
  clock?: () => Date;
}

export interface CommerceService {
  createPublicPurchase(
    workspaceSlug: string,
    programSlug: string,
    input: CreatePublicPurchaseRequest
  ): Promise<CreatePublicPurchaseResponse>;
  getPublicPaymentInfo(workspaceSlug: string): Promise<PublicPaymentInfo>;
  listOrders(
    organizationId: string,
    filter?: { status?: PurchaseStatus; method?: PurchaseMethod }
  ): Promise<ProgramPurchaseRequest[]>;
  getOrderById(organizationId: string, orderId: string): Promise<ProgramPurchaseRequest | null>;
  approvePurchaseRequest(
    organizationId: string,
    orderId: string,
    actorUserId: string
  ): Promise<{ order: ProgramPurchaseRequest; enrollmentId: string; wasAlreadyApproved: boolean }>;
  rejectPurchaseRequest(
    organizationId: string,
    orderId: string,
    actorUserId: string,
    reason?: string | null
  ): Promise<ProgramPurchaseRequest>;
  getPaymentSettings(organizationId: string): Promise<OrganizationPaymentSettings>;
  updateSalesWhatsAppNumber(organizationId: string, salesWhatsApp: string | null): Promise<OrganizationPaymentSettings>;
  createBankAccount(organizationId: string, input: CreateBankAccountRequest): Promise<OrganizationBankAccount>;
  updateBankAccount(organizationId: string, id: string, input: UpdateBankAccountRequest): Promise<OrganizationBankAccount | null>;
  deleteBankAccount(organizationId: string, id: string): Promise<boolean>;
}

export function createCommerceService(
  db: NodePgDatabase,
  options?: CommerceServiceOptions
): CommerceService {
  const clock = options?.clock ?? (() => new Date());

  const orgRepo = createOrganizationRepository(db);
  const programRepo = createProgramRepository(db);
  const contactRepo = createContactRepository(db, normalizePhone, normalizeEmail);
  const enrollmentRepo = createEnrollmentRepository(db);
  const learningEventRepo = createLearningEventRepository(db);
  const paymentSettingsRepo = createPaymentSettingsRepository(db);
  const purchaseRequestRepo = createPurchaseRequestRepository(db);
  const workspaceProfileRepo = createWorkspaceProfileRepository(db);

  return {
    async createPublicPurchase(
      workspaceSlug: string,
      programSlug: string,
      input: CreatePublicPurchaseRequest
    ): Promise<CreatePublicPurchaseResponse> {
      const now = clock();
      const nowIso = now.toISOString();

      if (!input.name?.trim()) {
        throw new DomainError('VALIDATION_ERROR', 'Nama lengkap wajib diisi');
      }
      if (!input.phone?.trim()) {
        throw new DomainError('VALIDATION_ERROR', 'Nomor WhatsApp wajib diisi');
      }

      // 1. Resolve Organization by Slug
      const org = await orgRepo.findBySlug(workspaceSlug.trim());
      if (!org) {
        throw new DomainError('NOT_FOUND', 'Workspace promotor tidak ditemukan');
      }

      // 2. Resolve Program by Org & Slug
      const program = await programRepo.findBySlug({ organizationId: org.id }, programSlug.trim());
      if (!program) {
        throw new DomainError('NOT_FOUND', 'Program edukasi tidak ditemukan');
      }

      // 3. Validate Program Publication & Paid status
      if (program.status !== 'published') {
        throw new DomainError('FORBIDDEN', 'Program edukasi belum dipublikasikan');
      }
      if (program.pricing !== 'one_time' || program.priceAmount <= 0) {
        throw new DomainError('VALIDATION_ERROR', 'Program ini adalah program gratis. Silakan mendaftar langsung.');
      }

      // 4. Validate Purchase Method
      const paymentSettings = await paymentSettingsRepo.getPaymentSettings(org.id);
      const activeBankAccounts = await paymentSettingsRepo.getActiveBankAccounts(org.id);

      let effectiveSalesWhatsApp = paymentSettings.salesWhatsAppNumber;
      if (!effectiveSalesWhatsApp) {
        try {
          const profile = await workspaceProfileRepo.getProfile({ organizationId: org.id });
          if (profile.whatsappPhoneE164) {
            effectiveSalesWhatsApp = profile.whatsappPhoneE164;
          }
        } catch {
          // Ignore
        }
      }

      if (input.purchaseMethod === 'BANK_TRANSFER') {
        if (!program.bankTransferEnabled) {
          throw new DomainError('FORBIDDEN', 'Metode pembayaran transfer bank belum diaktifkan untuk program ini');
        }
        if (activeBankAccounts.length === 0) {
          throw new DomainError('FORBIDDEN', 'Belum ada rekening bank aktif yang dikonfigurasi pengajar');
        }
      } else if (input.purchaseMethod === 'WHATSAPP') {
        if (!program.whatsAppEnabled) {
          throw new DomainError('FORBIDDEN', 'Metode pembelian via WhatsApp belum diaktifkan untuk program ini');
        }
        if (!effectiveSalesWhatsApp) {
          throw new DomainError('FORBIDDEN', 'Nomor WhatsApp penjualan belum dikonfigurasi pengajar');
        }
      } else {
        throw new DomainError('VALIDATION_ERROR', 'Metode pembelian tidak valid');
      }

      // 5. Match or Create Shared Contact
      let contact;
      try {
        contact = await contactRepo.matchOrCreate({
          context: { organizationId: org.id },
          phoneRaw: input.phone.trim(),
          name: input.name.trim(),
        });
      } catch (err: any) {
        throw new DomainError('VALIDATION_ERROR', err?.message || 'Format nomor telepon tidak valid');
      }

      // 6. Generate Unique Purchase Reference
      const purchaseReference = generatePurchaseReference();

      // 7. Determine selected bank account if applicable
      let selectedBankAccountId = input.bankAccountId || null;
      if (input.purchaseMethod === 'BANK_TRANSFER') {
        if (selectedBankAccountId) {
          const match = activeBankAccounts.find((b) => b.id === selectedBankAccountId);
          if (!match) selectedBankAccountId = activeBankAccounts[0].id;
        } else {
          selectedBankAccountId = activeBankAccounts[0].id;
        }
      }

      const selectedBank = selectedBankAccountId
        ? activeBankAccounts.find((b) => b.id === selectedBankAccountId)
        : null;

      // 8. Create Purchase Request (STATUS: PENDING - NO ENROLLMENT YET!)
      const purchaseRequest = await purchaseRequestRepo.create({
        organizationId: org.id,
        programId: program.id,
        programTitle: program.title,
        programSlug: program.slug,
        contactId: contact.id,
        purchaseReference,
        purchaseMethod: input.purchaseMethod,
        priceAmount: program.priceAmount,
        currency: 'IDR',
        buyerName: input.name.trim(),
        buyerPhone: normalizePhone(input.phone.trim()),
        buyerNote: input.buyerNote?.trim() || null,
        bankAccountId: selectedBankAccountId,
        bankAccountDetails: selectedBank
          ? {
              bankName: selectedBank.bankName,
              accountNumber: selectedBank.accountNumber,
              accountHolderName: selectedBank.accountHolderName,
            }
          : null,
      });

      // 8b. Register buyer as an active lead in contactFlowStates and record activity
      try {
        const [existingFlow] = await db
          .select()
          .from(contactFlowStates)
          .where(eq(contactFlowStates.contactId, contact.id))
          .limit(1);

        const orderNote = `Pesanan ${purchaseReference} (${input.purchaseMethod}) - Rp ${program.priceAmount.toLocaleString('id-ID')}`;
        if (existingFlow) {
          await db
            .update(contactFlowStates)
            .set({
              stage: 'INTERESTED',
              interest: program.title,
              notes: orderNote,
              updatedAt: nowIso,
            })
            .where(eq(contactFlowStates.contactId, contact.id));
        } else {
          await db.insert(contactFlowStates).values({
            organizationId: org.id,
            contactId: contact.id,
            stage: 'INTERESTED',
            classification: 'PROSPECT',
            interest: program.title,
            sourceChannel: 'STOREFRONT_ORDER',
            notes: orderNote,
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        }
      } catch (flowErr: any) {
        console.error('Failed to sync contactFlowState for purchase request:', flowErr?.message || flowErr);
      }

      try {
        await db.insert(activities).values({
          organizationId: org.id,
          contactId: contact.id,
          eventType: 'CLASS_SIGNAL',
          metadataJson: {
            signal: 'PURCHASE_REQUEST_SUBMITTED',
            purchaseReference,
            purchaseMethod: input.purchaseMethod,
            programTitle: program.title,
            programSlug: program.slug,
            priceAmount: program.priceAmount,
          },
          occurredAt: nowIso,
        });
      } catch (actErr: any) {
        console.error('Failed to record activity for purchase request:', actErr?.message || actErr);
      }

      // 9. Construct Response with Truthful Instructions
      let paymentInstructions: any = null;
      let whatsappPurchaseUrl: string | null = null;

      if (input.purchaseMethod === 'BANK_TRANSFER') {
        const confirmationWaUrl = effectiveSalesWhatsApp
          ? buildPurchaseWhatsAppUrl(effectiveSalesWhatsApp, {
              buyerName: input.name.trim(),
              programTitle: program.title,
              purchaseReference,
              purchaseMethod: 'BANK_TRANSFER',
            })
          : null;

        paymentInstructions = {
          programTitle: program.title,
          priceAmount: program.priceAmount,
          formattedPrice: formatIDR(program.priceAmount),
          purchaseReference,
          bankAccounts: activeBankAccounts.map((b) => ({
            id: b.id,
            bankName: b.bankName,
            accountNumber: b.accountNumber,
            accountHolderName: b.accountHolderName,
          })),
          whatsappConfirmationUrl: confirmationWaUrl,
        };
      } else if (input.purchaseMethod === 'WHATSAPP') {
        if (effectiveSalesWhatsApp) {
          whatsappPurchaseUrl = buildPurchaseWhatsAppUrl(effectiveSalesWhatsApp, {
            buyerName: input.name.trim(),
            programTitle: program.title,
            priceAmount: program.priceAmount,
            purchaseReference,
            purchaseMethod: 'WHATSAPP',
          });
        }
      }

      return {
        purchaseRequest,
        paymentInstructions,
        whatsappPurchaseUrl,
      };
    },

    async getPublicPaymentInfo(workspaceSlug: string): Promise<PublicPaymentInfo> {
      const org = await orgRepo.findBySlug(workspaceSlug.trim());
      if (!org) {
        throw new DomainError('NOT_FOUND', 'Workspace tidak ditemukan');
      }

      const settings = await paymentSettingsRepo.getPaymentSettings(org.id);
      const activeBanks = await paymentSettingsRepo.getActiveBankAccounts(org.id);

      let effectiveSalesWhatsApp = settings.salesWhatsAppNumber;
      if (!effectiveSalesWhatsApp) {
        try {
          const profile = await workspaceProfileRepo.getProfile({ organizationId: org.id });
          if (profile.whatsappPhoneE164) {
            effectiveSalesWhatsApp = profile.whatsappPhoneE164;
          }
        } catch {
          // Ignore
        }
      }

      return {
        salesWhatsAppNumber: effectiveSalesWhatsApp,
        bankAccounts: activeBanks.map((b) => ({
          id: b.id,
          bankName: b.bankName,
          accountNumber: b.accountNumber,
          accountHolderName: b.accountHolderName,
        })),
      };
    },

    async listOrders(
      organizationId: string,
      filter?: { status?: PurchaseStatus; method?: PurchaseMethod }
    ): Promise<ProgramPurchaseRequest[]> {
      return purchaseRequestRepo.listByOrg(organizationId, filter);
    },

    async getOrderById(organizationId: string, orderId: string): Promise<ProgramPurchaseRequest | null> {
      return purchaseRequestRepo.findById(organizationId, orderId);
    },

    async approvePurchaseRequest(
      organizationId: string,
      orderId: string,
      actorUserId: string
    ): Promise<{ order: ProgramPurchaseRequest; enrollmentId: string; wasAlreadyApproved: boolean }> {
      const now = clock();
      const nowIso = now.toISOString();

      // 1. Read existing order
      const existing = await purchaseRequestRepo.findById(organizationId, orderId);
      if (!existing) {
        throw new DomainError('NOT_FOUND', 'Pesanan tidak ditemukan');
      }

      // 2. Idempotent check: If already APPROVED, return safely
      if (existing.status === 'APPROVED' && existing.enrollmentId) {
        return {
          order: existing,
          enrollmentId: existing.enrollmentId,
          wasAlreadyApproved: true,
        };
      }

      if (existing.status === 'REJECTED') {
        throw new DomainError('FORBIDDEN', 'Pesanan yang telah ditolak tidak dapat disetujui');
      }

      // 3. Verify Program & Contact existence
      const program = await programRepo.findById({ organizationId }, existing.programId);
      if (!program) {
        throw new DomainError('NOT_FOUND', 'Program edukasi tidak ditemukan');
      }

      const contact = await contactRepo.findById({ organizationId }, existing.contactId);
      if (!contact) {
        throw new DomainError('NOT_FOUND', 'Data kontak pembeli tidak ditemukan');
      }

      // 4. Find or Create Canonical Enrollment
      let isNewEnrollment = false;
      let enrollment = await enrollmentRepo.findByProgramAndContact(
        organizationId,
        existing.programId,
        existing.contactId
      );

      if (!enrollment) {
        isNewEnrollment = true;
        enrollment = await enrollmentRepo.create({
          organizationId,
          programId: existing.programId,
          contactId: existing.contactId,
          status: 'ENROLLED',
          enrolledAt: nowIso,
          progressPercent: 0,
          intentScore: 10,
          intentLabel: 'COLD',
          learningStatus: 'NOT_STARTED',
        });
      }

      // 5. Emit canonical learner.enrolled EXACTLY ONCE
      if (isNewEnrollment) {
        try {
          await learningEventRepo.create({
            organizationId,
            enrollmentId: enrollment.id,
            contactId: existing.contactId,
            eventType: 'learner.enrolled',
            payload: {
              programId: program.id,
              programSlug: program.programSlug,
              purchaseReference: existing.purchaseReference,
              approvedByUserId: actorUserId,
            },
            occurredAt: nowIso,
          });
        } catch {
          // Milestone unique index protects duplicate events fail-safe
        }
      }

      // 6. Update Purchase Request to APPROVED
      const approvedOrder = await purchaseRequestRepo.approve(
        organizationId,
        orderId,
        actorUserId,
        enrollment.id
      );

      return {
        order: approvedOrder ?? existing,
        enrollmentId: enrollment.id,
        wasAlreadyApproved: false,
      };
    },

    async rejectPurchaseRequest(
      organizationId: string,
      orderId: string,
      actorUserId: string,
      reason?: string | null
    ): Promise<ProgramPurchaseRequest> {
      const existing = await purchaseRequestRepo.findById(organizationId, orderId);
      if (!existing) {
        throw new DomainError('NOT_FOUND', 'Pesanan tidak ditemukan');
      }

      if (existing.status === 'APPROVED') {
        throw new DomainError('FORBIDDEN', 'Pesanan yang telah disetujui tidak dapat ditolak');
      }

      const rejected = await purchaseRequestRepo.reject(
        organizationId,
        orderId,
        actorUserId,
        reason
      );

      if (!rejected) {
        throw new DomainError('INTERNAL_ERROR', 'Gagal memperbarui status penolakan pesanan');
      }

      return rejected;
    },

    async getPaymentSettings(organizationId: string): Promise<OrganizationPaymentSettings> {
      return paymentSettingsRepo.getPaymentSettings(organizationId);
    },

    async updateSalesWhatsAppNumber(
      organizationId: string,
      salesWhatsApp: string | null
    ): Promise<OrganizationPaymentSettings> {
      const normalized = salesWhatsApp ? normalizePhone(salesWhatsApp) : null;
      return paymentSettingsRepo.updateSalesWhatsAppNumber(organizationId, normalized);
    },

    async createBankAccount(
      organizationId: string,
      input: CreateBankAccountRequest
    ): Promise<OrganizationBankAccount> {
      return paymentSettingsRepo.createBankAccount(organizationId, input);
    },

    async updateBankAccount(
      organizationId: string,
      id: string,
      input: UpdateBankAccountRequest
    ): Promise<OrganizationBankAccount | null> {
      return paymentSettingsRepo.updateBankAccount(organizationId, id, input);
    },

    async deleteBankAccount(organizationId: string, id: string): Promise<boolean> {
      return paymentSettingsRepo.deleteBankAccount(organizationId, id);
    },
  };
}
