export interface AttachmentRowInput {
  kind?: 'image' | 'download' | undefined;
  name: string;
  url: string;
}

export interface AttachmentRow {
  kind: 'image' | 'download';
  name: string;
  url: string;
}

export function emptyAttachmentRow(): AttachmentRow {
  return { kind: 'download', name: '', url: '' };
}

export function normalizeAttachmentRows(rows: AttachmentRowInput[]): AttachmentRow[] {
  return rows
    .map((r) => ({
      kind: r.kind === 'image' ? ('image' as const) : ('download' as const),
      name: (r.name ?? '').trim(),
      url: (r.url ?? '').trim(),
    }))
    .filter((r) => r.name.length > 0 || r.url.length > 0)
    .filter((r) => {
      try {
        const u = new URL(r.url);
        return u.protocol === 'https:' || u.protocol === 'http:';
      } catch {
        return false;
      }
    });
}
