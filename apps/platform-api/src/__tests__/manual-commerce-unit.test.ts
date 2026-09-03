import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  formatIDR,
  generatePurchaseReference,
  buildPurchaseWhatsAppUrl,
  normalizePhone,
} from '@promotor/platform-core';
import {
  PurchaseMethodSchema,
  PurchaseStatusSchema,
  ProgramAccessTypeSchema,
  OrganizationBankAccountSchema,
  CreateBankAccountRequestSchema,
  ProgramPurchaseRequestSchema,
  CreatePublicPurchaseRequestSchema,
} from '@promotor/contracts';

describe('Manual Paid Program Commerce — Unit Tests', () => {
  describe('1. Currency & Formatter (formatIDR)', () => {
    it('formats integer amounts to standard IDR representation', () => {
      assert.strictEqual(formatIDR(0), 'Rp 0');
      assert.strictEqual(formatIDR(150000), 'Rp 150.000');
      assert.strictEqual(formatIDR(349000), 'Rp 349.000');
      assert.strictEqual(formatIDR(1250000), 'Rp 1.250.000');
    });

    it('handles negative or invalid number gracefully', () => {
      assert.strictEqual(formatIDR(NaN), 'Rp 0');
    });
  });

  describe('2. Purchase Reference Generator', () => {
    it('generates a stable TLR- prefix reference with 6 characters', () => {
      const ref = generatePurchaseReference();
      assert.ok(ref.startsWith('TLR-'), `Reference must start with TLR-: ${ref}`);
      assert.strictEqual(ref.length, 10, `Reference length must be 10: ${ref}`);
      assert.match(ref, /^TLR-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
    });

    it('generates unique references across multiple invocations', () => {
      const refs = new Set<string>();
      for (let i = 0; i < 50; i++) {
        refs.add(generatePurchaseReference());
      }
      assert.strictEqual(refs.size, 50, 'All 50 generated references should be unique');
    });
  });

  describe('3. WhatsApp URL Builder for Commerce', () => {
    it('builds canonical transfer confirmation WhatsApp deep link with reference', () => {
      const url = buildPurchaseWhatsAppUrl('+6281234567890', {
        buyerName: 'Ayu Rahma',
        programTitle: '7 Hari Mengenal Cara Belajar Anak',
        purchaseReference: 'TLR-8F4K2Q',
        purchaseMethod: 'BANK_TRANSFER',
      });

      assert.ok(url.startsWith('https://wa.me/6281234567890?text='));
      assert.ok(url.includes(encodeURIComponent('Ayu Rahma')));
      assert.ok(url.includes(encodeURIComponent('7 Hari Mengenal Cara Belajar Anak')));
      assert.ok(url.includes(encodeURIComponent('TLR-8F4K2Q')));
      assert.ok(url.includes(encodeURIComponent('transfer')));
    });

    it('builds canonical WhatsApp purchase deep link with price and reference', () => {
      const url = buildPurchaseWhatsAppUrl('+6281234567890', {
        buyerName: 'Budi Santoso',
        programTitle: 'Parenting Intensif STIFIn',
        priceAmount: 349000,
        purchaseReference: 'TLR-9X2M7L',
        purchaseMethod: 'WHATSAPP',
      });

      assert.ok(url.startsWith('https://wa.me/6281234567890?text='));
      assert.ok(url.includes(encodeURIComponent('Budi Santoso')));
      assert.ok(url.includes(encodeURIComponent('Parenting Intensif STIFIn')));
      assert.ok(url.includes(encodeURIComponent('Rp 349.000')));
      assert.ok(url.includes(encodeURIComponent('TLR-9X2M7L')));
    });
  });

  describe('4. Commerce Contract Validation Schemas', () => {
    it('validates PurchaseMethod enum', () => {
      assert.strictEqual(PurchaseMethodSchema.parse('BANK_TRANSFER'), 'BANK_TRANSFER');
      assert.strictEqual(PurchaseMethodSchema.parse('WHATSAPP'), 'WHATSAPP');
      assert.throws(() => PurchaseMethodSchema.parse('CREDIT_CARD'));
    });

    it('validates PurchaseStatus enum', () => {
      assert.strictEqual(PurchaseStatusSchema.parse('PENDING'), 'PENDING');
      assert.strictEqual(PurchaseStatusSchema.parse('APPROVED'), 'APPROVED');
      assert.strictEqual(PurchaseStatusSchema.parse('REJECTED'), 'REJECTED');
      assert.throws(() => PurchaseStatusSchema.parse('PAID'));
    });

    it('validates Bank Account creation schema', () => {
      const valid = CreateBankAccountRequestSchema.parse({
        bankName: 'BCA',
        accountNumber: '1234567890',
        accountHolderName: 'Rina Prameswari',
      });
      assert.strictEqual(valid.bankName, 'BCA');
      assert.strictEqual(valid.accountNumber, '1234567890');
      assert.strictEqual(valid.isActive, true);

      assert.throws(() =>
        CreateBankAccountRequestSchema.parse({
          bankName: '',
          accountNumber: '1234567890',
          accountHolderName: 'Rina',
        })
      );
    });

    it('validates Public Purchase Request submission schema', () => {
      const valid = CreatePublicPurchaseRequestSchema.parse({
        name: 'Ayu Rahma',
        phone: '081234567890',
        purchaseMethod: 'BANK_TRANSFER',
      });
      assert.strictEqual(valid.name, 'Ayu Rahma');
      assert.strictEqual(valid.purchaseMethod, 'BANK_TRANSFER');

      assert.throws(() =>
        CreatePublicPurchaseRequestSchema.parse({
          name: '',
          phone: '081234567890',
          purchaseMethod: 'BANK_TRANSFER',
        })
      );
    });
  });
});
