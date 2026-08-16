/**
 * Class-owned YouTube URL parsing and embed construction.
 * Pure helper without platform-core or external dependencies.
 */

const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

export interface ParsedYoutubeVideo {
  provider: 'youtube';
  url: string;
  externalId: string;
}

export function parseYoutubeUrl(input: string): ParsedYoutubeVideo | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
    let videoId: string | null = null;

    if (host === 'youtube.com') {
      if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v');
      } else if (parsed.pathname.startsWith('/embed/')) {
        videoId = parsed.pathname.slice('/embed/'.length).split('/')[0] || null;
      } else if (parsed.pathname.startsWith('/shorts/')) {
        videoId = parsed.pathname.slice('/shorts/'.length).split('/')[0] || null;
      }
    } else if (host === 'youtu.be') {
      videoId = parsed.pathname.slice(1).split('/')[0] || null;
    }

    if (!videoId || !YOUTUBE_ID_REGEX.test(videoId)) {
      return null;
    }

    return {
      provider: 'youtube',
      url: trimmed,
      externalId: videoId,
    };
  } catch {
    return null;
  }
}

export function buildYoutubeEmbedUrl(externalId: string): string {
  if (!YOUTUBE_ID_REGEX.test(externalId)) {
    throw new Error(`Invalid YouTube video ID: ${externalId}`);
  }
  return `https://www.youtube.com/embed/${externalId}`;
}
