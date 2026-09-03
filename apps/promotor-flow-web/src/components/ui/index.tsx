'use client';

import React from 'react';

export interface PageHeaderProps {
  kicker?: string;
  kickerAccent?: boolean;
  title: string;
  sub?: string;
  backLabel?: string;
  onBack?: () => void;
  action?: React.ReactNode;
}

export function PageHeader({ kicker, kickerAccent, title, sub, backLabel = 'Kembali', onBack, action }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div style={{ minWidth: 0 }}>
        {kicker ? <div className={`kicker${kickerAccent ? ' kicker-accent' : ''}`}>{kicker}</div> : null}
        <h1 className="page-title">{title}</h1>
        {sub ? <div className="page-sub">{sub}</div> : null}
      </div>
      {action}
      {onBack ? (
        <button type="button" className="back-btn" onClick={onBack}>
          {backLabel}
        </button>
      ) : null}
    </header>
  );
}

export interface SectionHeadProps {
  label: string;
  count?: string;
}

export function SectionHead({ label, count }: SectionHeadProps) {
  return (
    <div className="section-head">
      <div className="kicker">{label}</div>
      {count ? <div className="section-count">{count}</div> : null}
    </div>
  );
}

export interface SegmentedControlProps {
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}

export function SegmentedControl({ options, value, onChange, ariaLabel }: SegmentedControlProps) {
  return (
    <div className="segmented" role="group" aria-label={ariaLabel}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={opt.value === value ? 'is-active' : undefined}
          aria-pressed={opt.value === value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export interface ProgressBarProps {
  pct: number;
  accent?: boolean;
  thin?: boolean;
  thick?: boolean;
  label?: string;
}

export function ProgressBar({ pct, accent, thin, thick, label }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const cls = ['progress', thin ? 'progress-thin' : '', thick ? 'progress-thick' : ''].filter(Boolean).join(' ');
  return (
    <div
      className={cls}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <span className={accent ? 'progress-fill progress-accent' : 'progress-fill'} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy?: string;
}

export function BottomSheet({ open, onClose, children, labelledBy }: BottomSheetProps) {
  const sheetRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    sheetRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="sheet-overlay" onClick={onClose} aria-hidden="true" />
      <div ref={sheetRef} tabIndex={-1} className="sheet" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        {children}
      </div>
    </>
  );
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="toast" role="status">
      <div>{message}</div>
    </div>
  );
}

export function useToast(): [string | null, (msg: string) => void] {
  const [message, setMessage] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = React.useCallback((msg: string) => {
    setMessage(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2600);
  }, []);
  return [message, show];
}

export function EmptyState({ title, explanation, action }: { title: string; explanation?: string; action?: React.ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-title">{title}</div>
      {explanation ? <p>{explanation}</p> : null}
      {action ? <div style={{ marginTop: 12 }}>{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title = 'Terjadi kesalahan', detail, onRetry }: { title?: string; detail?: string; onRetry?: () => void }) {
  return (
    <div className="error-state">
      <div className="error-title">{title}</div>
      {detail ? <p>{detail}</p> : null}
      {onRetry ? (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry} style={{ marginTop: 10 }}>
          Coba lagi
        </button>
      ) : null}
    </div>
  );
}

export function LoadingRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="loading-state" data-testid="loading-state">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-line" style={{ width: `${88 - i * 14}%` }} />
      ))}
    </div>
  );
}

export function LifecycleStrip({ stages, currentIndex }: { stages: string[]; currentIndex: number }) {
  return (
    <div className="lifecycle">
      {stages.map((label, i) => (
        <div key={label} className={i <= currentIndex ? 'lifecycle-step on' : 'lifecycle-step'}>
          {label}
        </div>
      ))}
    </div>
  );
}

export function Wordmark({ flow, class: isClass, light, showIcon = true }: { flow?: boolean; class?: boolean; light?: boolean; showIcon?: boolean }) {
  const productName = flow ? 'FLOW' : isClass ? 'CLASS' : 'PLATFORM';
  return (
    <div className="wordmark" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
      {showIcon && (
        <img
          src="/icon.webp"
          alt="Talira"
          width={24}
          height={24}
          style={{ width: '24px', height: '24px', objectFit: 'contain', flexShrink: 0 }}
        />
      )}
      <span>
        TALIRA<span className="wordmark-dot" style={{ margin: '0 2px' }}>·</span>
        <span style={{ color: flow ? 'var(--accent, #125e51)' : isClass ? 'var(--accent, #0284c7)' : 'inherit' }}>
          {productName}
        </span>
      </span>
    </div>
  );
}

export function BrandLogo({ light, height = 28 }: { light?: boolean; height?: number }) {
  return (
    <img
      src={light ? '/logo-light.webp' : '/logo-dark.webp'}
      alt="Talira"
      style={{ height: `${height}px`, width: 'auto', objectFit: 'contain', display: 'block' }}
    />
  );
}
