export interface ReminderLearner {
  name: string;
  programTitle: string;
  progressPercent: number;
}

export function buildReminderDraft(learner: ReminderLearner): string {
  return [
    `Halo Kak ${learner.name} 😊`,
    '',
    `Semangat! Kakak sudah menyelesaikan ${learner.progressPercent}% dari program "${learner.programTitle}".`,
    'Tinggal sedikit lagi menuju sertifikat 🎓 Kalau ada kendala, kabari saya ya — saya bantu sampai selesai.',
  ].join('\n');
}

export function buildWaUrl(phoneE164: string, message: string): string {
  const digits = phoneE164.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
