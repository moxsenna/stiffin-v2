import { MessageTemplateRepositoryPort } from './ports';
import { NextActionType, MessageTemplate } from '@promotor/promotor-flow-fixtures';

export function createMessagingQueries(templateRepo: MessageTemplateRepositoryPort) {
  return {
    async listTemplates(): Promise<MessageTemplate[]> {
      return templateRepo.listTemplates();
    },

    async generateDraftMessage(
      category: NextActionType,
      contactName: string,
      context?: { dateText?: string; amount?: number; serviceTitle?: string }
    ): Promise<string> {
      const template = await templateRepo.getTemplateByCategory(category);
      if (!template) {
        return `Halo ${contactName}, salam dari promotor STIFIn. Ada yang bisa saya bantu terkait tes atau konsultasi?`;
      }

      let text = template.templateText.replace(/\[Nama\]/g, contactName);
      if (context?.dateText) {
        text = text.replace(/\[Tanggal\/Waktu\]/g, context.dateText).replace(/\[Tanggal\]/g, context.dateText);
      }
      if (context?.amount) {
        text = text.replace(/\[Amount\]/g, context.amount.toLocaleString('id-ID'));
      }
      if (context?.serviceTitle) {
        text = text.replace(/\[Layanan\]/g, context.serviceTitle);
      }

      return text;
    },

    buildWhatsAppUrl(phoneE164: string, messageText: string): string {
      // E.164 phone: +6281234567890 -> wa.me format: 6281234567890
      const cleanDigits = phoneE164.replace(/\+/g, '').replace(/[\s\-]/g, '');
      const encoded = encodeURIComponent(messageText);
      return `https://wa.me/${cleanDigits}?text=${encoded}`;
    },
  };
}
