import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { detectPreferredLanguage, LANGUAGES, TRANSLATIONS, type LangCode } from '../data/i18n';
import { routeRequest } from '../lib/api-platform';

export interface UserProfile {
  id: number;
  email: string;
  fullName: string;
  role: 'citizen' | 'advocate' | 'admin';
  state: string;
  lga: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  preferredLang: LangCode;
  whatsappOptIn: boolean;
  amplifyCount: number;
  createdAt: string;
}

export type MobileOnlyFeature =
  | 'live_streaming'
  | 'background_location'
  | 'sos_panic'
  | 'offline_vault'
  | 'push_alerts'
  | 'offline_drafts'
  | 'voice_first_app';

interface AppContextValue {
  user: UserProfile | null;
  token: string | null;
  setSession: (token: string | null, user: UserProfile | null) => void;
  refreshUser: () => Promise<void>;
  lang: LangCode;
  setLang: (code: LangCode) => void;
  t: (typeof TRANSLATIONS)['en'];
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setThemeExplicit: (mode: 'light' | 'dark') => void;
  editionMode: 'web' | 'mobile';
  setEditionMode: (mode: 'web' | 'mobile') => void;
  detectedArea: { state: string; lga: string };
  setDetectedArea: (area: { state: string; lga: string }) => void;
  isOffline: boolean;
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  activeAppGate: MobileOnlyFeature | null;
  openAppGate: (feature: MobileOnlyFeature) => void;
  closeAppGate: () => void;
  apiFetch: <T = unknown>(url: string, init?: RequestInit) => Promise<T>;
}

const AppContext = createContext<AppContextValue | null>(null);

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage.getItem('cwn_theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('cwn_token'));
  const [user, setUser] = useState<UserProfile | null>(() => {
    const raw = localStorage.getItem('cwn_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserProfile;
    } catch {
      return null;
    }
  });

  const [lang, setLangState] = useState<LangCode>(() => detectPreferredLanguage());
  const [theme, setTheme] = useState<'light' | 'dark'>(() => getInitialTheme());
  const [editionMode, setEditionModeState] = useState<'web' | 'mobile'>(() => {
    const saved = localStorage.getItem('cwn_edition');
    return saved === 'mobile' ? 'mobile' : 'web';
  });
  const [detectedArea, setDetectedAreaState] = useState<{ state: string; lga: string }>(() => {
    const raw = localStorage.getItem('cwn_area');
    if (raw) {
      try {
        return JSON.parse(raw) as { state: string; lga: string };
      } catch {
        // ignore
      }
    }
    return { state: 'Lagos', lga: 'Ikeja' };
  });

  const [isOffline, setIsOffline] = useState<boolean>(() => !navigator.onLine);
  const [unreadCount, setUnreadCount] = useState<number>(2);
  const [activeAppGate, setActiveAppGate] = useState<MobileOnlyFeature | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cwn_theme', theme);
  }, [theme]);

  useEffect(() => {
    const langMeta = LANGUAGES.find((l) => l.code === lang);
    document.documentElement.lang = langMeta?.code || 'en';
    localStorage.setItem('cwn_lang', lang);
  }, [lang]);

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const setSession = useCallback((nextToken: string | null, nextUser: UserProfile | null) => {
    setToken(nextToken);
    setUser(nextUser);
    if (nextToken && nextUser) {
      localStorage.setItem('cwn_token', nextToken);
      localStorage.setItem('cwn_user', JSON.stringify(nextUser));
    } else {
      localStorage.removeItem('cwn_token');
      localStorage.removeItem('cwn_user');
    }
  }, []);

  const apiFetch = useCallback(
    async <T = unknown>(url: string, init: RequestInit = {}): Promise<T> => {
      const headers = new Headers(init.headers || {});
      if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      const cacheKey = `cwn_cache_${url}`;
      try {
        const res = await routeRequest(url, { ...init, headers });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Request could not be completed.');
        }
        if ((!init.method || init.method === 'GET') && url.startsWith('/api/')) {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(data));
          } catch {
            // storage full
          }
        }
        return data as T;
      } catch (err) {
        if ((!init.method || init.method === 'GET') && !navigator.onLine) {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            return JSON.parse(cached) as T;
          }
        }
        throw err;
      }
    },
    [token]
  );

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch<{ user: UserProfile }>('/api/auth/me');
      setUser(data.user);
      localStorage.setItem('cwn_user', JSON.stringify(data.user));
    } catch {
      setSession(null, null);
    }
  }, [token, apiFetch, setSession]);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const data = await apiFetch<{ notifications: Array<{ is_read: number }> }>('/api/notifications');
      setUnreadCount(data.notifications.filter((n) => !n.is_read).length);
    } catch {
      // ignore offline
    }
  }, [apiFetch]);

  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount, token]);

  const setLang = (code: LangCode) => setLangState(code);
  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  const setThemeExplicit = (mode: 'light' | 'dark') => setTheme(mode);
  const setEditionMode = (mode: 'web' | 'mobile') => {
    setEditionModeState(mode);
    localStorage.setItem('cwn_edition', mode);
  };

  const setDetectedArea = (area: { state: string; lga: string }) => {
    setDetectedAreaState(area);
    localStorage.setItem('cwn_area', JSON.stringify(area));
  };

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        setSession,
        refreshUser,
        lang,
        setLang,
        t: TRANSLATIONS[lang] || TRANSLATIONS.en,
        theme,
        toggleTheme,
        setThemeExplicit,
        editionMode,
        setEditionMode,
        detectedArea,
        setDetectedArea,
        isOffline,
        unreadCount,
        refreshUnreadCount,
        activeAppGate,
        openAppGate: (f) => setActiveAppGate(f),
        closeAppGate: () => setActiveAppGate(null),
        apiFetch,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
