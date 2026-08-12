'use client';

import React from 'react';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { StorefrontSettingsClient } from '@/components/promotor/StorefrontSettingsClient';

export default function StorefrontPage() {
  return (
    <PromotorShell>
      <div style={{ padding: '20px 16px', maxWidth: '840px', margin: '0 auto' }}>
        <StorefrontSettingsClient />
      </div>
    </PromotorShell>
  );
}
