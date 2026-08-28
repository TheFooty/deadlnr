'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeId, APP_THEMES } from '@/lib/types';

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'default',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>('default');

  const applyTheme = (themeId: ThemeId) => {
    const t = APP_THEMES[themeId] || APP_THEMES.default;
    const root = document.documentElement;

    // Core surfaces
    root.style.setProperty('--bg', t.bg);
    root.style.setProperty('--bg-main', t.bg);
    root.style.setProperty('--surface', t.card);
    root.style.setProperty('--card-surface', t.card);
    root.style.setProperty('--surface-2', t.surface2);

    // UI accent (buttons, links, interactive elements)
    root.style.setProperty('--accent', t.uiAccent);
    root.style.setProperty('--accent-hover', adjustColor(t.uiAccent, 20));
    root.style.setProperty('--accent-active', adjustColor(t.uiAccent, -20));
    root.style.setProperty('--ui-accent', t.uiAccent);

    // Brand / success
    root.style.setProperty('--brand-primary', t.primary);
    root.style.setProperty('--accent-positive', t.accent);

    root.setAttribute('data-theme', themeId);
  };

  // Lighten/darken a hex color by amount (-255 to 255)
  function adjustColor(hex: string, amount: number): string {
    try {
      const num = parseInt(hex.replace('#', ''), 16);
      const r = Math.min(255, Math.max(0, (num >> 16) + amount));
      const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
      const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    } catch {
      return hex;
    }
  }

  useEffect(() => {
    // 1. Apply local storage immediately for fast render
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('deadlnr_theme') as ThemeId;
      if (savedTheme && APP_THEMES[savedTheme]) {
        setThemeState(savedTheme);
        applyTheme(savedTheme);
      } else {
        applyTheme('default');
      }
    }

    // 2. Fetch server theme from Supabase account settings for cross-device sync
    async function syncServerTheme() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.theme && APP_THEMES[data.theme as ThemeId]) {
            const serverTheme = data.theme as ThemeId;
            setThemeState(serverTheme);
            applyTheme(serverTheme);
            if (typeof window !== 'undefined') {
              localStorage.setItem('deadlnr_theme', serverTheme);
            }
          }
        }
      } catch (err) {}
    }
    syncServerTheme();
  }, []);

  const setTheme = (newTheme: ThemeId) => {
    if (!APP_THEMES[newTheme]) return;
    setThemeState(newTheme);
    applyTheme(newTheme);

    if (typeof window !== 'undefined') {
      localStorage.setItem('deadlnr_theme', newTheme);
      document.cookie = `deadlnr_theme=${newTheme}; path=/; max-age=31536000`;
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
