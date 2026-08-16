/**
 * Class-owned slug generation helper.
 */

export function slugifyTitle(title: string): string {
  if (!title || typeof title !== 'string') return 'program';
  const cleaned = title
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return cleaned.length > 0 ? cleaned : 'program';
}
