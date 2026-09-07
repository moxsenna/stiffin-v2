import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CreateContactNoteRequestSchema } from '@promotor/contracts';
import { createContactCommands } from '../modules/contacts/commands';
import { FlowActivity } from '@promotor/promotor-flow-fixtures';

describe('Task C2 — Contact Quick Note Unit & Schema Tests', () => {
  describe('CreateContactNoteRequestSchema', () => {
    it('menerima catatan yang valid', () => {
      const parsed = CreateContactNoteRequestSchema.safeParse({
        body: 'Anak kelas 2 SMP, pemalu, suka melukis.',
      });
      assert.strictEqual(parsed.success, true);
      if (parsed.success) {
        assert.strictEqual(parsed.data.body, 'Anak kelas 2 SMP, pemalu, suka melukis.');
      }
    });

    it('menolak catatan kosong atau spasi saja', () => {
      const empty = CreateContactNoteRequestSchema.safeParse({ body: '' });
      assert.strictEqual(empty.success, false);

      const spaces = CreateContactNoteRequestSchema.safeParse({ body: '    ' });
      assert.strictEqual(spaces.success, false);
      if (!spaces.success) {
        assert.match(spaces.error.issues[0].message, /Catatan tidak boleh kosong/);
      }
    });

    it('menolak catatan melebihi 1000 karakter', () => {
      const longText = 'a'.repeat(1001);
      const parsed = CreateContactNoteRequestSchema.safeParse({ body: longText });
      assert.strictEqual(parsed.success, false);
      if (!parsed.success) {
        assert.match(parsed.error.issues[0].message, /Catatan maksimal 1000 karakter/);
      }
    });
  });

  describe('contactCommands.addContactNote', () => {
    it('menyimpan catatan cepat dan menambahkan aktivitas NOTE_ADDED dalam mode mock', async () => {
      const activities: Omit<FlowActivity, 'id'>[] = [];
      const mockActivityRepo = {
        async listActivities() {
          return [];
        },
        async appendActivity(act: Omit<FlowActivity, 'id'>) {
          activities.push(act);
          return { ...act, id: 'act_123' } as FlowActivity;
        },
      };

      const mockContactRepo = {
        async listContacts() { return []; },
        async getContactDetail() { return null; },
        async findContactByPhone() { return null; },
        async createContact() { throw new Error('not implemented'); },
        async updateContact() { throw new Error('not implemented'); },
      };

      const commands = createContactCommands(mockContactRepo as any, mockActivityRepo as any);
      assert.strictEqual(typeof (commands as any).addContactNote, 'function');

      await (commands as any).addContactNote('contact_123', 'Catatan observasi anak');
      assert.strictEqual(activities.length, 1);
      assert.strictEqual(activities[0].contactId, 'contact_123');
      assert.strictEqual(activities[0].title, 'Catatan');
      assert.strictEqual(activities[0].type, 'NOTE_ADDED');
      assert.strictEqual(activities[0].detail, 'Catatan observasi anak');
    });

    it('menolak catatan kosong pada command', async () => {
      const mockContactRepo = {} as any;
      const commands = createContactCommands(mockContactRepo);
      await assert.rejects(
        async () => {
          await (commands as any).addContactNote('contact_123', '   ');
        },
        /Catatan tidak boleh kosong/
      );
    });
  });
});
