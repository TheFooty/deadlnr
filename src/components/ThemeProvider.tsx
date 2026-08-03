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
    const themeConfig = APP_THEMES[themeId] || APP_THEMES.default;
    const root = document.documentElement;

    root.style.setProperty('--brand-primary', themeConfig.primary);
    root.style.setProperty('--bg-main', themeConfig.bg);
    root.style.setProperty('--card-surface', themeConfig.card);
    root.style.setProperty('--accent-positive', themeConfig.accent);
    root.setAttribute('data-theme', themeId);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('deadlnr_theme') as ThemeId;
      if (savedTheme && APP_THEMES[savedTheme]) {
        setThemeState(savedTheme);
        applyTheme(savedTheme);
      } else {
        applyTheme('default');
      }
    }
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
