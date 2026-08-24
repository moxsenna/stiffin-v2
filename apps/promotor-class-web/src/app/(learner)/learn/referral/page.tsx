'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getLearnerReferralSummaryQuery } from '@/modules/referrals/queries';
import { LearnerReferralSummary } from '@/modules/referrals/types';
import { LearnerTabBar } from '@/components/layout/LearnerTabBar';

export default function LearnerReferralPage() {
  const [summary, setSummary] = useState<LearnerReferralSummary | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() =>{
    getLearnerReferralSummaryQuery().then(res =>setSummary(res));
  }, []);

  const handleCopyLink = () =>{
    if (!summary) return;
    navigator.clipboard.writeText(summary.shareUrl);
    setCopied(true);
    setTimeout(() =>setCopied(false), 2500);
  };

  const handleShareWhatsApp = () =>{
    if (!summary) return;
    const url = `https://wa.me/?text=${encodeURIComponent(summary.whatsappShareText)}`;
    window.open(url, '_blank');
  };

  if (!summary) {
    return (
      <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
       Memuat Program Referral...
      </div>
   );
  }

  return (
    <div
      className="page-wrapper-with-bottom-nav"
      style={{
        backgroundColor: 'var(--color-canvas)',
        minHeight: '100vh',
        color: 'var(--color-text-main)',
      }}
    >
     <div style={{ padding: '20px 16px', maxWidth: '640px', margin: '0 auto' }}>
       {/* Navigation back to Profile */}
        <div style={{ marginBottom: '16px' }}>
         <Link
            href="/learn/profile"
            style={{
              fontSize: '13px',
              color: 'var(--color-text-muted)',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
           ← Kembali ke Profil Saya
          </Link>
       </div>

       {/* Prototype Info Alert */}
        <div
          style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '0px',
            padding: '12px 14px',
            fontSize: '12px',
            color: '#1E40AF',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
         <span style={{ fontSize: '18px' }}></span>
         <div>
           <strong>Referral Prototype (Draft B4.5):</strong>Halaman ini merupakan pratinjau antarmuka referral. Penukaran reward nyata akan diaktifkan penuh setelah milestone backend B4.5.
          </div>
       </div>

       {/* Hero Card */}
        <div
          style={{
            background: 'var(--ink)',
            color: '#FFF',
            borderRadius: '0px',
            padding: '24px 20px',
            marginBottom: '20px',
          }}
        >
         <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', fontWeight: 700, marginBottom: '6px' }}>
           Program Referral STIFIn
          </div>
         <h1 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', lineHeight: 1.3 }}>
           Ajak Teman & Orang Tua Lain Belajar Bersama
          </h1>
         <p style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: 1.5, marginBottom: '18px' }}>
           Bagikan tautan referral unik Anda. Dapatkan reward voucher workshop dan akses modul eksklusif untuk setiap teman yang menyelesaikan tes atau program berbayar.
          </p>

         {/* Referral Code & Actions */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '0px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <span style={{ fontSize: '12px', color: '#94A3B8' }}>Kode Unik Anda:</span>
             <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '2px', color: '#38BDF8' }}>
               {summary.code}
              </span>
           </div>

           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
             <button
                type="button"
                onClick={handleCopyLink}
                style={{
                  backgroundColor: copied ? 'var(--color-status-success)' : 'rgba(255, 255, 255, 0.9)',
                  color: copied ? '#FFF' : '#0F172A',
                  border: 0,
                  borderRadius: '0px',
                  padding: '10px 12px',
                  fontSize: '13px',
                  fontWeight: 750,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
               {copied ? '✓ Link Tersalin!' : ' Salin Tautan'}
              </button>

             <button
                type="button"
                onClick={handleShareWhatsApp}
                style={{
                  backgroundColor: '#25D366',
                  color: '#FFF',
                  border: 0,
                  borderRadius: '0px',
                  padding: '10px 12px',
                  fontSize: '13px',
                  fontWeight: 750,
                  cursor: 'pointer',
                }}
              >
                Bagikan WA
              </button>
           </div>
         </div>
       </div>

       {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
         <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-divider)',
              borderRadius: '0px',
              padding: '12px 8px',
              textAlign: 'center',
            }}
          >
           <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-dark)' }}>
             {summary.stats.totalInvited}
            </div>
           <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Diajak</div>
         </div>

         <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-divider)',
              borderRadius: '0px',
              padding: '12px 8px',
              textAlign: 'center',
            }}
          >
           <div style={{ fontSize: '18px', fontWeight: 800, color: '#3B82F6' }}>
             {summary.stats.engagedCount}
            </div>
           <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Terdaftar</div>
         </div>

         <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-divider)',
              borderRadius: '0px',
              padding: '12px 8px',
              textAlign: 'center',
            }}
          >
           <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-status-success)' }}>
             {summary.stats.qualifiedCount}
            </div>
           <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Qualified</div>
         </div>

         <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-divider)',
              borderRadius: '0px',
              padding: '12px 8px',
              textAlign: 'center',
            }}
          >
           <div style={{ fontSize: '18px', fontWeight: 800, color: '#8B5CF6' }}>
             {summary.stats.rewardsEarned}
            </div>
           <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Reward</div>
         </div>
       </div>

       {/* How It Works Section */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: '0px',
            border: '1px solid var(--color-divider)',
            padding: '18px',
            marginBottom: '20px',
          }}
        >
         <h2 style={{ fontSize: '15px', fontWeight: 750, marginBottom: '12px' }}>Cara Kerja Referral</h2>
         <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
           <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
             <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '0px',
                  backgroundColor: '#ffe0d9',
                  color: 'var(--accent-dark)',
                  fontWeight: 750,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
               1
              </div>
             <div style={{ fontSize: '13px', lineHeight: 1.4 }}>
               <strong>Bagikan Tautan:</strong>Kirim kode atau link referral unik Anda ke teman atau grup WhatsApp.
              </div>
           </div>

           <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
             <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '0px',
                  backgroundColor: '#ffe0d9',
                  color: 'var(--accent-dark)',
                  fontWeight: 750,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
               2
              </div>
             <div style={{ fontSize: '13px', lineHeight: 1.4 }}>
               <strong>Teman Mendaftar Gratis:</strong>Teman Anda mendaftar program gratis melalui link Anda (Status: Terdaftar).
              </div>
           </div>

           <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
             <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '0px',
                  backgroundColor: '#ffe0d9',
                  color: 'var(--accent-dark)',
                  fontWeight: 750,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
               3
              </div>
             <div style={{ fontSize: '13px', lineHeight: 1.4 }}>
               <strong>Dapatkan Reward:</strong>Saat teman menyelesaikan tes STIFIn atau program berbayar, Anda & teman mendapatkan voucher/bonus (Hold period D+7).
              </div>
           </div>
         </div>
       </div>

       {/* Masked History Table */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: '0px',
            border: '1px solid var(--color-divider)',
            padding: '18px',
          }}
        >
         <h2 style={{ fontSize: '15px', fontWeight: 750, marginBottom: '12px' }}>Riwayat Referral Saya</h2>

         {summary.history.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '16px 0' }}>
             Belum ada riwayat undangan. Mulai bagikan tautan Anda!
            </div>
         ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
             {summary.history.map(item =>(
                <div
                  key={item.id}
                  style={{
                    padding: '12px',
                    borderRadius: '0px',
                    backgroundColor: 'var(--color-canvas)',
                    border: '1px solid var(--color-divider)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div style={{ fontWeight: 750, fontSize: '13px' }}>{item.maskedName}</div>
                   <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '0px',
                        backgroundColor:
                          item.status === 'QUALIFIED'
                            ? '#DCFCE7'
                            : item.status === 'PENDING'
                            ? '#FEF3C7'
                            : '#F1F5F9',
                        color:
                          item.status === 'QUALIFIED'
                            ? '#166534'
                            : item.status === 'PENDING'
                            ? '#92400E'
                            : '#475569',
                      }}
                    >
                     {item.status === 'QUALIFIED' ? '✓ Qualified' : item.status === 'PENDING' ? '⏳ Pending D+7' : 'Terdaftar'}
                    </div>
                 </div>

                 <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                   Program: {item.programTitle}
                  </div>

                 {item.rewardTitle && (
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-dark)', marginTop: '2px' }}>
                      Reward: {item.rewardTitle}
                    </div>
                 )}
                </div>
             ))}
            </div>
         )}
        </div>
     </div>

     {/* Bottom Nav Bar - Profil tab active */}
      <LearnerTabBar />
   </div>
 );
}
