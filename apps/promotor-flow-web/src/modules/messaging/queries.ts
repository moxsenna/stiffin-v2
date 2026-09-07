import { MessageTemplateRepositoryPort } from './ports';
import { NextActionType, MessageTemplate } from '@promotor/promotor-flow-fixtures';
import type { MessageTemplateTone } from '@promotor/contracts';

export interface DraftContext {
  dateText?: string;
  amount?: number;
  serviceTitle?: string;
}

export function pickTemplateByTone(
  templates: MessageTemplate[],
  category: string,
  tone?: MessageTemplateTone | null
): MessageTemplate | undefined {
  const inCategory = templates.filter((t) => t.category === category && t.isActive !== false);
  if (tone) {
    const exact = inCategory.find((t) => t.tone === tone);
    if (exact) return exact;
  }
  return inCategory.find((t) => t.tone == null) ?? inCategory[0];
}

export function interpolateTemplate(
  templateText: string,
  contactName: string,
  context?: DraftContext
): string {
  let text = templateText.replace(/\[Nama\]/g, contactName);
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
}

export function createMessagingQueries(templateRepo: MessageTemplateRepositoryPort) {
  return {
    async listTemplates(): Promise<MessageTemplate[]> {
      return templateRepo.listTemplates();
    },

    async generateDraftMessage(
      category: NextActionType | string,
      contactName: string,
      context?: DraftContext,
      tone?: MessageTemplateTone | null
    ): Promise<string> {
      const templates = await templateRepo.listTemplates();
      const template = pickTemplateByTone(templates, category, tone);
      if (!template) {
        return `Halo ${contactName}, salam dari promotor STIFIn. Ada yang bisa saya bantu terkait tes atau konsultasi?`;
      }

      return interpolateTemplate(template.templateText, contactName, context);
    },

    buildWhatsAppUrl(phoneE164: string, messageText: string): string {
      // E.164 phone: +6281234567890 -> wa.me format: 6281234567890
      const cleanDigits = phoneE164.replace(/\+/g, '').replace(/[\s\-]/g, '');
      const encoded = encodeURIComponent(messageText);
      return `https://wa.me/${cleanDigits}?text=${encoded}`;
    },
  };
}
