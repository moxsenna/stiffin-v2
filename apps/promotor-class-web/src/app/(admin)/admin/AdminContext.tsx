'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getPlatformApiClient } from '@/adapters';

interface AdminContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  adminKey: string;
  adminUser: { role: string; name: string } | null;
  login: (key: string) => Promise<boolean>;
  logout: () => Promise<void>;
  client: ReturnType<typeof getPlatformApiClient>;
}

const AdminContext = createContext<AdminContextType | null>(null);

const STORAGE_KEY = 'ralivo_admin_api_key';

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminKey, setAdminKey] = useState('');
  const [adminUser, setAdminUser] = useState<{ role: string; name: string } | null>(null);

  const client = getPlatformApiClient();

  const verifyAuth = useCallback(async (key?: string) => {
    try {
      const activeKey = key ?? (typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY) || '' : '');
      const res = await client.adminGetMe(activeKey || undefined);
      if (res.authenticated) {
        setIsAuthenticated(true);
        setAdminUser({ role: res.role || 'superadmin', name: res.name || 'Admin Ralivo' });
        if (activeKey) {
          setAdminKey(activeKey);
        }
        return true;
      }
    } catch {
      // Not authenticated
    }
    setIsAuthenticated(false);
    setAdminUser(null);
    return false;
  }, [client]);

  useEffect(() => {
    const key = typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY) || '' : '';
    verifyAuth(key).finally(() => setIsLoading(false));
  }, [verifyAuth]);

  const login = async (key: string): Promise<boolean> => {
    try {
      const res = await client.adminLogin(key);
      if (res.success) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(STORAGE_KEY, key);
          localStorage.setItem(STORAGE_KEY, key);
        }
        setAdminKey(key);
        setIsAuthenticated(true);
        setAdminUser(res.admin);
        return true;
      }
    } catch (err) {
      console.error('Admin login error:', err);
    }
    return false;
  };

  const logout = async () => {
    try {
      await client.adminLogout();
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
    }
    setAdminKey('');
    setIsAuthenticated(false);
    setAdminUser(null);
  };

  return (
    <AdminContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        adminKey,
        adminUser,
        login,
        logout,
        client,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return ctx;
}
