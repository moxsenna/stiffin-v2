'use client';

import React, { useEffect, useRef } from 'react';
import { loadYoutubeIframeApi } from '@/lib/video/youtube-iframe-api';

export function resolveStartSeconds(startSeconds: number, isCompleted: boolean): number {
  return !isCompleted && startSeconds > 30 ? Math.max(0, startSeconds - 2) : 0;
}

export interface YoutubeLessonPlayerProps {
  videoId: string;
  startSeconds: number;
  isCompleted: boolean;
  onEnded: () => void;
  onPositionChange: (positionSeconds: number) => void;
}

export function YoutubeLessonPlayer({ videoId, startSeconds, isCompleted, onEnded, onPositionChange }: YoutubeLessonPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const endedRef = useRef(false);

  useEffect(() => {
    let disposed = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    let lastSaved = 0;

    loadYoutubeIframeApi().then((YT) => {
      if (disposed || !containerRef.current) return;
      playerRef.current = new YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          // Lanjut dari titik terakhir hanya jika belum selesai & posisi tersimpan > 30 detik
          start: resolveStartSeconds(startSeconds, isCompleted),
        },
        events: {
          onStateChange: (event: any) => {
            // 0 = ENDED
            if (event.data === 0 && !endedRef.current) {
              endedRef.current = true;
              onEnded();
            }
          },
        },
      });

      interval = setInterval(() => {
        const player = playerRef.current;
        if (!player?.getCurrentTime) return;
        const t = Math.floor(player.getCurrentTime());
        // simpan paling sering tiap 10 detik agar hemat request
        if (t - lastSaved >= 10 || (t < lastSaved && t > 0)) {
          lastSaved = t;
          onPositionChange(t);
        }
      }, 5000);
    });

    return () => {
      disposed = true;
      if (interval) clearInterval(interval);
      try { playerRef.current?.destroy?.(); } catch { /* abaikan */ }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return (
    <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
    </div>
  );
}
