// Nomor WhatsApp support Ralivo — satu sumber untuk semua CTA "Aktifkan".
export const SUPPORT_WA_NUMBER = '6281234567890';

export function supportWaUrl(message: string): string {
  return `https://wa.me/${SUPPORT_WA_NUMBER}?text=${encodeURIComponent(message)}`;
}
