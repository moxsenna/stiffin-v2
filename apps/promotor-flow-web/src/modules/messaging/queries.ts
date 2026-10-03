import { MessageTemplateRepositoryPort, MessagingPort } from './ports';
import { NextActionType, MessageTemplate } from '@promotor/promotor-flow-fixtures';
import type { MessageTemplateTone, WaStatusResponse, WaInboxMessage } from '@promotor/contracts';

export interface DraftContext {
  dateText?: string;
  amount?: number;
  serviceTitle?: string;
  bookingLink?: string;
  stifinResult?: string;
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
  if (context?.bookingLink) {
    text = text.replace(/\[LinkBooking\]/g, context.bookingLink).replace(/\[Lokasi\]/g, context.bookingLink);
  }
  if (context?.stifinResult) {
    text = text.replace(/\[HasilSTIFIn\]/g, context.stifinResult);
  }
  text = text.replace(/\[Jam\]/g, context?.dateText ?? '[Jam]').replace(/\[Tanggal\]/g, context?.dateText ?? '[Tanggal]');
  return text;
}

export function createMessagingQueries(
  templateRepo: MessageTemplateRepositoryPort,
  messagingPort?: MessagingPort
) {
  return {
    async listTemplates(): Promise<MessageTemplate[]> {
      return templateRepo.listTemplates();
    },

    /** Builds the public booking URL for a promotor slug, e.g. /p/rina/book. */
    buildBookingLink(slug?: string | null, serviceId?: string | null): string {
      const path =
        typeof window !== 'undefined' && window.location?.origin
          ? `${window.location.origin}/p/${slug || 'anda'}/book`
          : `/p/${slug || 'anda'}/book`;
      return serviceId ? `${path}?serviceId=${encodeURIComponent(serviceId)}` : path;
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

    async getWhatsAppStatus(): Promise<WaStatusResponse | null> {
      if (!messagingPort) return null;
      return messagingPort.getWhatsAppStatus();
    },

    async listWhatsAppInbox(): Promise<WaInboxMessage[]> {
      if (!messagingPort) return [];
      return messagingPort.listWhatsAppInbox();
    },
  };
}
