'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { SwipeDeck } from '@/components/SwipeDeck';
import { CanvasAssignment, PreferredAI, AI_PROVIDERS } from '@/lib/types';
import { useDevice } from '@/lib/use-device';
import { RefreshCw } from 'lucide-react';
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
          <div className="mb-4 w-full max-w-md rounded-xl bg-amber-500/10 px-4 py-3 text-xs text-amber-300 flex items-center justify-between gap-3">
            <span>
              {noFeedUrl
                ? 'Showing sample data — add your Canvas feed in settings to sync.'
                : 'Demo mode — showing sample assignments.'}
            </span>
            <Link
              href="/settings"
              className="shrink-0 font-semibold underline underline-offset-2 hover:text-white"
            >
              Settings
            </Link>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-5 sm:mb-6">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight font-display">
            What's due?
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Skip or send to {currentAi.name}
          </p>
        </div>

        {/* Center Container: Swipe Deck */}
        <div className="flex justify-center w-full">
          {loading ? (
            <div className="flex h-[480px] sm:h-[520px] lg:h-[560px] w-full max-w-sm sm:max-w-md lg:max-w-lg flex-col items-center justify-center rounded-[2.25rem] border border-slate-800 bg-[#111622]/60 p-8 backdrop-blur-xl card-tactile">
              <RefreshCw className="h-7 w-7 text-[#FF3B00] animate-spin mb-4" />
              <p className="text-base font-bold text-white">Fetching assignments…</p>
            </div>
          ) : error && assignments.length === 0 ? (
            <div className="flex h-96 w-full max-w-md flex-col items-center justify-center rounded-[2.25rem] border border-rose-500/20 bg-rose-500/5 p-8 text-center">
              <h3 className="text-lg font-bold text-white mb-1">Couldn't load your feed</h3>
              <p className="text-xs text-rose-300/80 mb-5">{error}</p>
              <button
                onClick={fetchData}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2.5 text-xs font-semibold text-white border border-slate-700 transition-colors"
              >
                Retry
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
