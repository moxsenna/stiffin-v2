'use client';

import React, { useEffect, useRef, useState } from 'react';
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

  // Video p31ucD7z0sg (STIFIn Sensing vs Thinking) has embedding disabled by owner on YouTube.
  const isEmbedRestrictedVideo = videoId === 'p31ucD7z0sg';
  const [isPlaying, setIsPlaying] = useState(false);
  const [embedBlocked, setEmbedBlocked] = useState(isEmbedRestrictedVideo);

  useEffect(() => {
    if (!isPlaying || embedBlocked) return;

    let disposed = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    let lastSaved = 0;

    loadYoutubeIframeApi().then((YT) => {
      if (disposed || !containerRef.current) return;
      playerRef.current = new YT.Player(containerRef.current, {
        width: '100%',
        height: '100%',
        videoId,
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          start: resolveStartSeconds(startSeconds, isCompleted),
        },
        events: {
          onStateChange: (event: any) => {
            if (event.data === 0 && !endedRef.current) {
              endedRef.current = true;
              onEnded();
            }
          },
          onError: (event: any) => {
            // 101 or 150: video owner disabled embedding
            if (event.data === 101 || event.data === 150 || event.data === 100) {
              setEmbedBlocked(true);
            }
          },
        },
      });

      interval = setInterval(() => {
        const player = playerRef.current;
        if (!player?.getCurrentTime) return;
        const t = Math.floor(player.getCurrentTime());
        if (t - lastSaved >= 10 || (t < lastSaved && t > 0)) {
          lastSaved = t;
          onPositionChange(t);
        }
      }, 5000);
    });

    return () => {
      disposed = true;
      if (interval) clearInterval(interval);
      try { playerRef.current?.destroy?.(); } catch { /* ignore */ }
      playerRef.current = null;
    };
  }, [isPlaying, embedBlocked, videoId, startSeconds, isCompleted, onEnded, onPositionChange]);

  const posterUrl = videoId === 'p31ucD7z0sg'
    ? '/images/lessons/sensing-vs-thinking-thumb.webp'
    : `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16/9',
        backgroundColor: '#090d16',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.06)',
      }}
    >
      {/* Background Poster Image */}
      <img
        src={posterUrl}
        alt="Video thumbnail"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
        onError={(e) => {
          e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        }}
      />

      {/* Dark Vignette Overlay for Crisp Contrast */}
      {(!isPlaying || embedBlocked) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Duration Badge */}
      {(!isPlaying || embedBlocked) && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            padding: '3px 8px',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            borderRadius: 6,
            color: '#ffffff',
            fontSize: 11,
            fontWeight: 700,
            zIndex: 3,
          }}
        >
          15:42
        </div>
      )}

      {/* Play Button Facade or Fallback Modal */}
      {!isPlaying && (
        <button
          type="button"
          onClick={() => {
            if (isEmbedRestrictedVideo) {
              setEmbedBlocked(true);
            }
            setIsPlaying(true);
          }}
          aria-label="Putar video materi"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            zIndex: 4,
          }}
        >
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.45), 0 0 0 4px rgba(255, 255, 255, 0.25)',
              transition: 'transform 150ms ease, background-color 150ms ease',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff" style={{ marginLeft: 3 }}>
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </button>
      )}

      {/* When playing and embedding is restricted by video owner */}
      {isPlaying && embedBlocked && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            textAlign: 'center',
            zIndex: 5,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 750,
              color: '#ffffff',
              marginBottom: 6,
            }}
          >
            Materi Video STIFIn Institute
          </div>
          <p
            style={{
              fontSize: 11.5,
              color: 'rgba(255, 255, 255, 0.8)',
              maxWidth: 320,
              lineHeight: 1.4,
              marginBottom: 14,
            }}
          >
            Pemutaran langsung dibatasi pemilik channel di situs luar. Tonton video lengkapnya langsung di YouTube.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 8,
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#ffffff">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>Buka di YouTube ↗</span>
            </a>
            <button
              type="button"
              onClick={() => {
                onEnded();
                setIsPlaying(false);
              }}
              style={{
                padding: '7px 12px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Tandai Selesai Menonton ✓
            </button>
          </div>
        </div>
      )}

      {/* YouTube Iframe Mounting Point (only active when playing & not blocked) */}
      {isPlaying && !embedBlocked && (
        <div
          ref={containerRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 2,
          }}
        />
      )}

      <style jsx>{`
        div :global(iframe) {
          position: absolute;
          top: 0;
          left: 0;
          width: 100% !important;
          height: 100% !important;
          border: 0 !important;
          border-radius: 12px;
          display: block;
        }
      `}</style>
    </div>
  );
}
