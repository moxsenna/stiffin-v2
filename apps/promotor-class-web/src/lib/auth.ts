export interface UserSession {
  user: { id: string; name: string; email: string };
  organization: { id: string; name: string; slug: string } | null;
  membership: { id: string; role: string } | null;
  entitlements: { promotorClass: boolean; promotorFlow: boolean } | null;
}

/**
 * Deterministically sanitizes returnTo query parameter to prevent open redirects
 * and ensure redirection stays strictly within the protected /app internal surface.
 */
export function sanitizeReturnTo(returnTo: string | null | undefined): string {
  if (!returnTo || typeof returnTo !== 'string') {
    return '/app';
  }

  const trimmed = returnTo.trim();

  // Must start with /app (and not //, /\, or \ )
  if (!trimmed.startsWith('/app')) {
    return '/app';
  }

  // Reject protocol/scheme bypasses or backslashes
  if (
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.includes('\\') ||
    trimmed.includes('%5c') ||
    trimmed.includes('%5C') ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ||
    /javascript:|data:|vbscript:/i.test(trimmed)
  ) {
    return '/app';
  }

  // Ensure path delimiter right after /app if there is additional path (e.g. /app/..., /app?..., /app#...)
  const afterApp = trimmed.slice(4);
  if (afterApp.length > 0 && afterApp[0] !== '/' && afterApp[0] !== '?' && afterApp[0] !== '#') {
    return '/app';
  }

  return trimmed;
}

export async function getSession(): Promise<UserSession | null> {
  const mode = process.env.NEXT_PUBLIC_API_MODE;
  if (mode !== 'http' && process.env.NODE_ENV !== 'production') {
    return {
      user: { id: 'usr-demo-promotor', name: 'Rina Prameswari', email: 'rina@stifin.id' },
      organization: { id: 'org-demo-rina', name: 'STIFIn Parenting Promotor', slug: 'rina' },
      membership: { id: 'mem-demo', role: 'owner' },
      entitlements: { promotorClass: true, promotorFlow: true },
    };
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
  try {
    const res = await fetch(`${apiUrl}/api/me`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  const mode = process.env.NEXT_PUBLIC_API_MODE;
  if (mode !== 'http' && process.env.NODE_ENV !== 'production') {
    if (email && password) {
      return { success: true };
    }
    return { success: false, error: 'Email dan kata sandi wajib diisi' };
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
  try {
    const res = await fetch(`${apiUrl}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err?.message || 'Email atau kata sandi tidak valid' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal terhubung ke server autentikasi' };
  }
}

export async function signOut(): Promise<void> {
  const mode = process.env.NEXT_PUBLIC_API_MODE;
  if (mode !== 'http' && process.env.NODE_ENV !== 'production') {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('promotor_session_token');
    }
    return;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
  try {
    await fetch(`${apiUrl}/api/auth/sign-out`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem('promotor_session_token');
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!currentPassword || !newPassword) {
    return { success: false, error: 'Kata sandi saat ini dan kata sandi baru wajib diisi' };
  }
  if (newPassword.length < 8) {
    return { success: false, error: 'Kata sandi baru minimal 8 karakter' };
  }

  const mode = process.env.NEXT_PUBLIC_API_MODE;
  if (mode !== 'http' && process.env.NODE_ENV !== 'production') {
    return { success: true };
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
  try {
    const res = await fetch(`${apiUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err?.message || 'Gagal mengubah kata sandi. Pastikan kata sandi lama benar.' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal terhubung ke server autentikasi' };
  }
}

