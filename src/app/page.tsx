'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { SwipeDeck } from '@/components/SwipeDeck';
import { CanvasAssignment, PreferredAI, AI_PROVIDERS } from '@/lib/types';
import { useDevice } from '@/lib/use-device';
import { AlertCircle, RefreshCw, Settings, Zap } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const [assignments, setAssignments] = useState<CanvasAssignment[]>([]);
  const [preferredAi, setPreferredAi] = useState<PreferredAI>('gemini');
  const [isMock, setIsMock] = useState(false);
  const [noFeedUrl, setNoFeedUrl] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { deviceType } = useDevice();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Check local storage fallback first
      if (typeof window !== 'undefined') {
        const localAi = localStorage.getItem('deadlnr_preferred_ai') as PreferredAI;
        if (localAi && AI_PROVIDERS[localAi]) {
          setPreferredAi(localAi);
        }
      }

      // Fetch settings from API
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.preferred_ai && AI_PROVIDERS[settingsData.preferred_ai as PreferredAI]) {
          setPreferredAi(settingsData.preferred_ai);
          if (typeof window !== 'undefined') {
            localStorage.setItem('deadlnr_preferred_ai', settingsData.preferred_ai);
          }
        }
      }

      // Fetch Canvas assignments
      const feedRes = await fetch('/api/canvas/feed');
      const feedData = await feedRes.json();

      if (feedData.error) {
        setError(feedData.error);
      }

      setAssignments(feedData.assignments || []);
      setIsMock(!!feedData.isMock);
      setNoFeedUrl(!!feedData.noFeedUrl);
    } catch (err: any) {
      console.error('Failed to load assignments:', err);
      setError('Unable to reach backend API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const currentAi = AI_PROVIDERS[preferredAi] || AI_PROVIDERS.gemini;

  return (
    <div className="min-h-screen bg-[#080A0F] text-slate-100 flex flex-col font-sans selection:bg-[#FF3B00]/30 selection:text-[#FF3B00]">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 max-w-4xl mx-auto w-full">
        {/* Banner if Demo Mode / Feed URL missing */}
        {isMock && !loading && (
          <div className="mb-4 w-full max-w-md rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300 flex items-center justify-between gap-3 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
              <span>
                {noFeedUrl
                  ? 'Showing sample assignments. Paste your Canvas feed link in Settings to sync live deadlines.'
                  : 'Demo Mode: Showing sample Canvas assignments.'}
              </span>
            </div>
            <Link
              href="/settings"
              className="shrink-0 font-bold underline hover:text-white flex items-center gap-1 bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30"
            >
              <Settings className="h-3 w-3" />
              <span>Settings</span>
            </Link>
          </div>
        )}

        {/* Header Tagline */}
        <div className="text-center mb-4 sm:mb-6">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-[#FF3B00]/10 via-rose-500/10 to-amber-500/10 border border-[#FF3B00]/20 text-xs font-mono font-bold text-[#FF3B00] mb-2">
            <Zap className="h-3.5 w-3.5 fill-[#FF3B00] text-[#FF3B00]" />
            <span>Triage assignments on {deviceType.toUpperCase()}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight font-display">
            Canvas Assignment Triage
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto font-medium">
            Swipe <span className="text-[#FF0055] font-bold">LEFT</span> to skip • Swipe{' '}
            <span className="text-[#00E599] font-bold">RIGHT</span> to launch in {currentAi.name}
          </p>
        </div>

        {/* Center Container: Swipe Deck */}
        <div className="flex justify-center w-full">
          {loading ? (
            <div className="flex h-[480px] sm:h-[520px] lg:h-[560px] w-full max-w-sm sm:max-w-md lg:max-w-lg flex-col items-center justify-center rounded-[2.25rem] border border-slate-800 bg-[#111622]/60 p-8 shadow-2xl backdrop-blur-xl card-tactile">
              <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800">
                <RefreshCw className="h-8 w-8 text-[#FF3B00] animate-spin" />
              </div>
              <p className="text-lg font-black text-white font-display">Parsing Canvas iCal Feed...</p>
              <p className="text-xs font-mono text-slate-400 mt-1">Decrypting feed URL & normalizing deadlines</p>
            </div>
          ) : error && assignments.length === 0 ? (
            <div className="flex h-96 w-full max-w-md flex-col items-center justify-center rounded-[2.25rem] border border-rose-500/30 bg-rose-500/10 p-8 text-center shadow-2xl backdrop-blur-xl">
              <AlertCircle className="h-12 w-12 text-rose-400 mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Unable to Load iCal Feed</h3>
              <p className="text-xs text-rose-200 mb-4">{error}</p>
              <button
                onClick={fetchData}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-xs font-bold text-white border border-slate-700 shadow-md"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry Fetch</span>
              </button>
            </div>
          ) : (
            <SwipeDeck
              initialAssignments={assignments}
              preferredAi={preferredAi}
              isMockData={isMock}
              onRefreshFeed={fetchData}
            />
          )}
        </div>
      </main>
    </div>
  );
}
