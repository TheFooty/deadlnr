'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { PreferredAI, AI_PROVIDERS, ThemeId, APP_THEMES } from '@/lib/types';
import { useTheme } from '@/components/ThemeProvider';
import { Lock, Check, HelpCircle, ArrowLeft, Loader2, Palette, Sparkles, Layers, UserCheck, LogIn, Key, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';


export default function SettingsPage() {
  const [feedUrl, setFeedUrl] = useState('');
  const [preferredAi, setPreferredAi] = useState<PreferredAI>('gemini');
  const [showDemoData, setShowDemoData] = useState<boolean>(false); // OFF by default
  const [hasFeedUrl, setHasFeedUrl] = useState(false);
  const [apiToken, setApiToken] = useState('');
  const [hasApiToken, setHasApiToken] = useState(false);
  const [showApiToken, setShowApiToken] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // Read local fallback first
    if (typeof window !== 'undefined') {
      const localAi = localStorage.getItem('deadlnr_preferred_ai') as PreferredAI;
      if (localAi && AI_PROVIDERS[localAi]) {
        setPreferredAi(localAi);
      }
      const localDemo = localStorage.getItem('deadlnr_show_demo_data') === 'true';
      setShowDemoData(localDemo);
    }

    async function loadSettings() {
      try {
        // Check Auth User
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.isLoggedIn && meData.email) {
            setUserEmail(meData.email);
            setIsGuest(false);
          }
        }

        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.preferred_ai) {
            setPreferredAi(data.preferred_ai);
            if (typeof window !== 'undefined') {
              localStorage.setItem('deadlnr_preferred_ai', data.preferred_ai);
            }
          }
          if (data.theme) {
            setTheme(data.theme);
          }
          if (typeof data.show_demo_data === 'boolean') {
            setShowDemoData(data.show_demo_data);
            if (typeof window !== 'undefined') {
              localStorage.setItem('deadlnr_show_demo_data', String(data.show_demo_data));
            }
          }
          if (data.has_feed_url) setHasFeedUrl(true);
          if (data.feed_url) setFeedUrl(data.feed_url);
          if (data.has_api_token) setHasApiToken(true);
          if (data.api_token) setApiToken(data.api_token);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [setTheme]);

  const handleThemeSelect = (selectedTheme: ThemeId) => {
    setTheme(selectedTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('deadlnr_theme', selectedTheme);
      document.cookie = `deadlnr_theme=${selectedTheme}; path=/; max-age=31536000`;
    }
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: selectedTheme }),
    }).catch(() => {});
  };

  const handleAiSelect = (ai: PreferredAI) => {
    setPreferredAi(ai);
    if (typeof window !== 'undefined') {
      localStorage.setItem('deadlnr_preferred_ai', ai);
      document.cookie = `deadlnr_preferred_ai=${ai}; path=/; max-age=31536000`;
    }
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferred_ai: ai }),
    }).catch(() => {});
  };

  const handleDemoToggle = (enabled: boolean) => {
    setShowDemoData(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('deadlnr_show_demo_data', String(enabled));
      document.cookie = `deadlnr_show_demo_data=${enabled}; path=/; max-age=31536000`;
    }
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ show_demo_data: enabled }),
    }).catch(() => {});
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    if (typeof window !== 'undefined') {
      localStorage.setItem('deadlnr_preferred_ai', preferredAi);
      localStorage.setItem('deadlnr_show_demo_data', String(showDemoData));
      document.cookie = `deadlnr_preferred_ai=${preferredAi}; path=/; max-age=31536000`;
      document.cookie = `deadlnr_show_demo_data=${showDemoData}; path=/; max-age=31536000`;
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feed_url: feedUrl.trim() || undefined,
          api_token: apiToken.trim() || undefined,
          preferred_ai: preferredAi,
          theme,
          show_demo_data: showDemoData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setMessage({
        text: feedUrl.trim()
          ? `Settings & Calendar Feed URL saved successfully! Synchronized across all your devices.`
          : `Settings saved successfully! Synchronized across all your devices.`,
        type: 'success',
      });
      if (feedUrl.trim()) setHasFeedUrl(true);
    } catch (err: any) {
      setMessage({ text: err.message || 'An error occurred', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080A0F] text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto w-full p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white font-display">App Settings</h1>
            <p className="text-xs text-slate-400">Configure your themes, Canvas feed & preferred AI chat assistant</p>
          </div>
        </div>

        {/* Account Sync Status Banner */}
        <div className="mb-6 rounded-2xl border border-slate-800 bg-[#111622] p-5 card-tactile">
          {isGuest ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <LogIn className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Guest Mode (Local Storage)</h3>
                  <p className="text-xs text-slate-400">
                    Your calendar feed link, themes, and tasks will save locally on this device. Log in to sync across devices.
                  </p>
                </div>
              </div>

              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#FF3B00] hover:bg-[#FF3B00]/90 px-4 py-2 text-xs font-bold text-white shadow-lg shrink-0 font-display"
              >
                <span>Log In with Email</span>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#00E599]/15 text-[#00E599] border border-[#00E599]/30">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Account Connected & Synced</span>
                  <span className="text-[10px] font-mono text-[#00E599] bg-[#00E599]/10 px-2 py-0.5 rounded border border-[#00E599]/20">
                    {userEmail}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Your calendar feed, custom tasks, file attachments, and themes sync automatically to this account across all devices.
                </p>
              </div>
            </div>
          )}
        </div>

        {message && (
          <div
            className={`mb-6 rounded-xl p-4 text-sm flex items-start gap-2 ${
              message.type === 'success'
                ? 'bg-[#00E599]/10 text-[#00E599] border border-[#00E599]/20'
                : 'bg-[#FF0055]/10 text-[#FF0055] border border-[#FF0055]/20'
            }`}
          >
            {message.type === 'success' ? <Check className="h-4 w-4 shrink-0 mt-0.5" /> : <HelpCircle className="h-4 w-4 shrink-0 mt-0.5" />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Custom Themes Selector */}
          <div className="rounded-2xl border border-slate-800 bg-[#111622] p-6 card-tactile">
            <div className="flex items-center gap-2 mb-1">
              <Palette className="h-5 w-5 text-[#FF3B00]" />
              <h2 className="text-lg font-bold text-white font-display">Custom App Theme</h2>
            </div>
            <p className="text-sm text-slate-400 mb-5">
              Personalize Deadlnr&apos;s interface color palette across all your devices.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(Object.keys(APP_THEMES) as ThemeId[]).map((themeKey) => {
                const themeOption = APP_THEMES[themeKey];
                const isSelected = theme === themeKey;

                return (
                  <button
                    key={themeKey}
                    type="button"
                    onClick={() => handleThemeSelect(themeKey)}
                    className={`relative flex items-center justify-between rounded-xl border p-4 transition-all text-left ${
                      isSelected
                        ? 'border-[#FF3B00] bg-[#FF3B00]/10 shadow-lg'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-white text-sm mb-1.5">{themeOption.name}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="h-3.5 w-3.5 rounded-full border border-white/20" style={{ backgroundColor: themeOption.primary }} title="Primary Accent" />
                        <span className="h-3.5 w-3.5 rounded-full border border-white/20" style={{ backgroundColor: themeOption.bg }} title="Background" />
                        <span className="h-3.5 w-3.5 rounded-full border border-white/20" style={{ backgroundColor: themeOption.card }} title="Card Surface" />
                        <span className="h-3.5 w-3.5 rounded-full border border-white/20" style={{ backgroundColor: themeOption.accent }} title="Success / Completion" />
                      </div>
                    </div>

                    {isSelected && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FF3B00] text-white">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Sample Demo Data Toggle (OFF by default) */}
          <div className="rounded-2xl border border-slate-800 bg-[#111622] p-6 card-tactile">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Layers className="h-5 w-5 text-[#FF3B00]" />
                  <h2 className="text-lg font-bold text-white font-display">
                    Sample Demo Assignments
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-400">
                  Include sample mock tasks when no real Canvas/calendar feed deadlines exist. <strong className="text-slate-200">(Off by default)</strong>
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={showDemoData}
                  onChange={(e) => handleDemoToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-slate-900 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF3B00] border border-slate-700"></div>
              </label>
            </div>
          </div>

          {/* Section 3: Preferred AI Picker */}
          <div className="rounded-2xl border border-slate-800 bg-[#111622] p-6 card-tactile">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-[#FF3B00]" />
              <h2 className="text-lg font-bold text-white font-display">
                Default AI Assistant
              </h2>
            </div>
            <p className="text-sm text-slate-400 mb-5">
              Swiping right opens your assignment focus detail view and chosen AI chat.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(Object.keys(AI_PROVIDERS) as PreferredAI[]).map((key) => {
                const provider = AI_PROVIDERS[key];
                const isSelected = preferredAi === key;

                return (
                  <label
                    key={key}
                    onClick={() => handleAiSelect(key)}
                    className={`relative flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#FF3B00] bg-[#FF3B00]/5'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="preferred_ai"
                      value={key}
                      checked={isSelected}
                      onChange={() => handleAiSelect(key)}
                      className="sr-only"
                    />

                    <p className="font-bold text-[#FFFFFF] text-sm">{provider.name}</p>

                    {isSelected && (
                      <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF3B00] text-white">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Section 4: Calendar iCal Feed URL */}
          <div className="rounded-2xl border border-slate-800 bg-[#111622] p-6 card-tactile">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-white font-display">
                Canvas / Kognity Calendar Feed URL
              </h2>
              {hasFeedUrl && (
                <span className="text-xs font-semibold text-[#00E599] flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" />
                  Saved Feed Link
                </span>
              )}
            </div>

            <p className="text-sm text-slate-400 mb-4">
              Paste your Canvas or school iCal feed link below to automatically import your deadlines.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                  iCal Feed URL (.ics)
                </label>
                <input
                  type="url"
                  placeholder="https://your-school.instructure.com/feeds/calendars/user_XXXXXXXXXXXXXXXX.ics"
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-[#FF3B00] focus:outline-none focus:ring-1 focus:ring-[#FF3B00] font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Canvas API Token <span className="text-slate-500 font-normal">(Optional, for auto-hiding submitted)</span></span>
                  {hasApiToken && (
                    <span className="text-xs font-semibold text-[#00E599] flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Saved
                    </span>
                  )}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type={showApiToken ? "text" : "password"}
                    placeholder="7~XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-10 py-3 text-sm text-white placeholder-slate-600 focus:border-[#FF3B00] focus:outline-none focus:ring-1 focus:ring-[#FF3B00] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiToken(!showApiToken)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                  >
                    {showApiToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-xs text-slate-300 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-200 font-bold">
                    <HelpCircle className="h-4 w-4 text-[#FF3B00]" />
                    <span>How to get your Calendar Feed URL:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-400 pl-1">
                    <li>Log into your school Canvas LMS account.</li>
                    <li>
                      Click <strong className="text-slate-200">Calendar</strong> in the left sidebar.
                    </li>
                    <li>
                      Click <strong className="text-slate-200">&quot;Calendar Feed&quot;</strong> at the bottom right/left of the page.
                    </li>
                    <li>
                      Copy the entire <code className="text-[#FF3B00] bg-slate-900 px-1 rounded">.ics</code> feed URL and paste it above!
                    </li>
                  </ol>
                </div>
                
                <div className="space-y-2 pt-3 border-t border-slate-800/50">
                  <div className="flex items-center gap-2 text-slate-200 font-bold">
                    <HelpCircle className="h-4 w-4 text-[#FF3B00]" />
                    <span>How to get your Canvas API Token:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-400 pl-1">
                    <li>Log into Canvas and click <strong className="text-slate-200">Account</strong> → <strong className="text-slate-200">Settings</strong>.</li>
                    <li>Scroll down to <strong className="text-slate-200">&quot;Approved Integrations&quot;</strong> and click <strong className="text-slate-200">&quot;+ New Access Token&quot;</strong>.</li>
                    <li>Give it a name (e.g. "Deadlnr"), leave expiry blank, and click Generate.</li>
                    <li>Copy the long token and paste it above to automatically hide submitted assignments!</li>
                  </ol>
                </div>
              </div>

              {/* Privacy Note */}
              <p className="flex items-center gap-2 text-[11px] text-slate-500">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                Your feed URL is stored securely and parsed server-side.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FF3B00] hover:bg-[#FF3B00]/90 px-8 py-3.5 text-sm font-bold text-white active:scale-95 transition-all disabled:opacity-50 font-display shadow-lg shadow-[#FF3B00]/20"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Save Settings & Feed</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
