'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { PreferredAI, AI_PROVIDERS } from '@/lib/types';
import { Lock, Check, HelpCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const [feedUrl, setFeedUrl] = useState('');
  const [preferredAi, setPreferredAi] = useState<PreferredAI>('gemini');
  const [hasFeedUrl, setHasFeedUrl] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    // Read local fallback first
    if (typeof window !== 'undefined') {
      const localAi = localStorage.getItem('deadlnr_preferred_ai') as PreferredAI;
      if (localAi && AI_PROVIDERS[localAi]) {
        setPreferredAi(localAi);
      }
    }

    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.preferred_ai) {
            setPreferredAi(data.preferred_ai);
            if (typeof window !== 'undefined') {
              localStorage.setItem('deadlnr_preferred_ai', data.preferred_ai);
            }
          }
          if (data.has_feed_url) setHasFeedUrl(data.has_feed_url);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleAiSelect = (ai: PreferredAI) => {
    setPreferredAi(ai);
    if (typeof window !== 'undefined') {
      localStorage.setItem('deadlnr_preferred_ai', ai);
      document.cookie = `deadlnr_preferred_ai=${ai}; path=/; max-age=31536000`;
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    // Always update localStorage & Cookie immediately
    if (typeof window !== 'undefined') {
      localStorage.setItem('deadlnr_preferred_ai', preferredAi);
      document.cookie = `deadlnr_preferred_ai=${preferredAi}; path=/; max-age=31536000`;
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feed_url: feedUrl.trim() || undefined,
          preferred_ai: preferredAi,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      const selectedAiObj = AI_PROVIDERS[preferredAi];
      setMessage({
        text: `Settings saved! Preferred AI set to ${selectedAiObj.name}.`,
        type: 'success',
      });
      if (feedUrl.trim()) setHasFeedUrl(true);
      setFeedUrl(''); // Clear input for privacy
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
            <p className="text-xs text-slate-400">Configure your Canvas feed & preferred AI chat assistant</p>
          </div>
        </div>

        {message && (
          <div
            className={`mb-6 rounded-xl p-4 text-sm flex items-start gap-2 ${
              message.type === 'success'
                ? 'bg-[#00E599]/10 text-[#00E599]'
                : 'bg-[#FF0055]/10 text-[#FF0055]'
            }`}
          >
            {message.type === 'success' ? <Check className="h-4 w-4 shrink-0 mt-0.5" /> : <HelpCircle className="h-4 w-4 shrink-0 mt-0.5" />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          {/* Section 1: Preferred AI Picker */}
          <div className="rounded-2xl border border-slate-800 bg-[#111622] p-6 card-tactile">
            <h2 className="text-lg font-bold text-white mb-1 font-display">
              Default AI Assistant
            </h2>
            <p className="text-sm text-slate-400 mb-5">
              Swiping right copies assignment context and opens your chosen AI chat.
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

                    <p className="font-bold text-white text-sm">{provider.name}</p>

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

          {/* Section 2: Canvas iCal Feed URL */}
          <div className="rounded-2xl border border-slate-800 bg-[#111622] p-6 card-tactile">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-white font-display">
                Canvas Calendar Feed
              </h2>
              {hasFeedUrl && (
                <span className="text-xs font-semibold text-[#00E599]">
                  Saved
                </span>
              )}
            </div>

            <p className="text-sm text-slate-400 mb-4">
              Paste your personal Canvas iCal feed link. No admin key or access token required.
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

              {/* Step-by-Step Instructions */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-xs text-slate-300 space-y-2">
                <div className="flex items-center gap-2 text-slate-200 font-bold">
                  <HelpCircle className="h-4 w-4 text-[#FF3B00]" />
                  <span>How to find your Canvas Calendar Feed URL:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-400 pl-1">
                  <li>Log into your school Canvas LMS account.</li>
                  <li>
                    Click <strong className="text-slate-200">Calendar</strong> in the main left sidebar navigation.
                  </li>
                  <li>
                    Scroll down to the bottom-left of the sidebar and click{' '}
                    <strong className="text-slate-200">&quot;Calendar Feed&quot;</strong>.
                  </li>
                  <li>
                    Copy the entire <code className="text-[#FF3B00] bg-slate-900 px-1 rounded">.ics</code> feed URL and paste it above!
                  </li>
                </ol>
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
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FF3B00] hover:bg-[#FF3B00]/90 px-8 py-3.5 text-sm font-bold text-white active:scale-95 transition-all disabled:opacity-50 font-display"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Save Settings</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
