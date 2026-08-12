import { ProgramTemplate } from './ports';

export const SEED_TEMPLATES: ProgramTemplate[] = [
  {
    id: 'tpl_7hari_belajar',
    title: '7 Hari Mengenal Cara Belajar Anak',
    subtitle: 'Panduan Praktis Orang Tua Mengidentifikasi Mesin Kecerdasan Anak',
    description: 'Template e-course 7 hari terbukti konversi tinggi untuk lead magnet promotor parenting.',
    priceType: 'free',
  },
  {
    id: 'tpl_30hari_habit',
    title: '30 Hari Membangun Karakter STIFIn Anak',
    subtitle: 'Modul Pendampingan Harian Orang Tua',
    description: 'Template tantangan harian untuk pendaftar tes STIFIn pasca konsultasi.',
    priceType: 'paid',
  },
];

export async function getTemplatesQuery(): Promise<ProgramTemplate[]> {
  return SEED_TEMPLATES;
}

export async function getTemplateByIdQuery(id: string): Promise<ProgramTemplate | undefined> {
  return SEED_TEMPLATES.find(t => t.id === id);
}
