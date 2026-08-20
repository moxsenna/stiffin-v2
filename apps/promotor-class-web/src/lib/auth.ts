export interface UserSession {
  user: { id: string; name: string; email: string };
  organization: { id: string; name: string; slug: string } | null;
  membership: { id: string; role: string } | null;
  entitlements: { promotorClass: boolean; promotorFlow: boolean } | null;
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
