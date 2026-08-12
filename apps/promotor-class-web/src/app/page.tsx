import Link from 'next/link';

export default function HomeHubPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-canvas)', padding: '40px 16px' }}>
      <div
        style={{
          maxWidth: '560px',
          margin: '0 auto',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--border-radius-md)',
          border: '1px solid var(--color-divider)',
          padding: '24px',
        }}
      >
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>
          PromotorClass V0.1
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
          Client Education OS & Intent Signal Engine untuk Promotor STIFIn
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link
            href="/app"
            className="touch-target-primary"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: '#FFF',
              fontWeight: 700,
              borderRadius: 'var(--border-radius-md)',
              textAlign: 'center',
              textDecoration: 'none',
            }}
          >
            Buka Promotor OS (/app)
          </Link>

          <Link
            href="/learn"
            className="touch-target-primary"
            style={{
              border: '1px solid var(--color-primary)',
              color: 'var(--color-primary)',
              fontWeight: 700,
              borderRadius: 'var(--border-radius-md)',
              textAlign: 'center',
              textDecoration: 'none',
            }}
          >
            Buka Learner OS (/learn)
          </Link>

          <Link
            href="/p/rina/7-hari-mengenal-cara-belajar-anak"
            className="touch-target-primary"
            style={{
              backgroundColor: 'var(--color-canvas)',
              color: 'var(--color-text-main)',
              border: '1px solid var(--color-divider)',
              fontWeight: 600,
              borderRadius: 'var(--border-radius-md)',
              textAlign: 'center',
              textDecoration: 'none',
            }}
          >
            Buka Halaman Publik Pendaftaran (/p/rina/...)
          </Link>
        </div>
      </div>
    </div>
  );
}
