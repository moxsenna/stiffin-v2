export interface ConsultationClaimInput {
  learnerName?: string | null;
  programTitle: string;
  reflectionTopics?: string[];
}

function excerpt(text: string, max = 60): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export function buildConsultationClaimMessage(input: ConsultationClaimInput): string {
  const namePart = input.learnerName ? `saya ${input.learnerName}` : 'saya';
  const topics = (input.reflectionTopics ?? [])
    .filter((t) => t && t.trim().length > 0)
    .slice(0, 3)
    .map((t) => `• ${excerpt(t)}`);
  const topicLine = topics.length > 0
    ? `Refleksi saya fokus pada:\n${topics.join('\n')}`
    : 'Refleksi saya sudah lengkap di semua modul.';

  return [
    `Halo Kak, ${namePart} sudah menyelesaikan program "${input.programTitle}".`,
    topicLine,
    'Saya ingin klaim bonus sesi konsultasi STIFIn. Kapan jadwal yang tersedia?',
  ].join('\n\n');
}
