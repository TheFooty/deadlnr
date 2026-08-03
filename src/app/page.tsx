'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { SwipeDeck } from '@/components/SwipeDeck';
import { AddDeadlineModal } from '@/components/AddDeadlineModal';
import { CanvasAssignment, PreferredAI, ThemeId, AI_PROVIDERS } from '@/lib/types';
import { useDevice } from '@/lib/use-device';
import { RefreshCw, Plus } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const [assignments, setAssignments] = useState<CanvasAssignment[]>([]);
  const [preferredAi, setPreferredAi] = useState<PreferredAI>('gemini');
  const [isMock, setIsMock] = useState(false);
  const [noFeedUrl, setNoFeedUrl] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { deviceType } = useDevice();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (typeof window !== 'undefined') {
        const localAi = localStorage.getItem('deadlnr_preferred_ai') as PreferredAI;
        if (localAi && AI_PROVIDERS[localAi]) {
          setPreferredAi(localAi);
        }
      }

      let serverCustomList: CanvasAssignment[] = [];

      // Fetch user account settings across devices from Supabase
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.preferred_ai && AI_PROVIDERS[settingsData.preferred_ai as PreferredAI]) {
          setPreferredAi(settingsData.preferred_ai);
          if (typeof window !== 'undefined') {
            localStorage.setItem('deadlnr_preferred_ai', settingsData.preferred_ai);
          }
        }
        if (Array.isArray(settingsData.custom_assignments)) {
          serverCustomList = settingsData.custom_assignments;
        }
      }

      // Fetch Canvas feed assignments
      const feedRes = await fetch('/api/canvas/feed');
      const feedData = await feedRes.json();

      if (feedData.error) {
        setError(feedData.error);
      }

      let fetchedList: CanvasAssignment[] = feedData.assignments || [];
      let isMockData = !!feedData.isMock;

      // Read local custom user assignments from localStorage
      let localCustomList: CanvasAssignment[] = [];
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('deadlnr_custom_assignments');
          if (stored) localCustomList = JSON.parse(stored);
        } catch {}
      }

      // Merge server & local custom assignments (deduplicated by ID)
      const mergedMap = new Map<string, CanvasAssignment>();
      [...serverCustomList, ...localCustomList].forEach((item) => mergedMap.set(item.id, item));
      let customList = Array.from(mergedMap.values());

      // Save synced custom assignments list back to localStorage
      if (typeof window !== 'undefined' && customList.length > 0) {
        localStorage.setItem('deadlnr_custom_assignments', JSON.stringify(customList));
      }

      // 24-hour attachment cleanup routine for completed assignments
      const now = Date.now();
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      let historyList: any[] = [];
      if (typeof window !== 'undefined') {
        try {
          const storedHist = localStorage.getItem('deadlnr_swipe_history');
          if (storedHist) historyList = JSON.parse(storedHist);
        } catch {}
      }

      const completedTimeMap = new Map<string, number>();
      historyList.forEach((h: any) => {
        if (h.assignment_id && h.swiped_at) {
          completedTimeMap.set(h.assignment_id, new Date(h.swiped_at).getTime());
        }
      });

      let attachmentsPurged = false;
      customList = customList.map((item) => {
        const swipedAtMs = completedTimeMap.get(item.id);
        if (swipedAtMs && now - swipedAtMs > TWENTY_FOUR_HOURS && item.attachments && item.attachments.length > 0) {
          attachmentsPurged = true;
          return { ...item, attachments: [] };
        }
        return item;
      });

      if (attachmentsPurged && typeof window !== 'undefined') {
        localStorage.setItem('deadlnr_custom_assignments', JSON.stringify(customList));
      }

      // If user has custom assignments, remove mock sample assignments completely!
      if (customList.length > 0 && isMockData) {
        fetchedList = [];
        isMockData = false;
      }

      // Combine & sort by due date
      const combined = [...customList, ...fetchedList];
      const sorted = combined.sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );

      setAssignments(sorted);
      setIsMock(isMockData && customList.length === 0);
      setNoFeedUrl(!!feedData.noFeedUrl && customList.length === 0);
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

  const handleCustomAssignmentAdded = (newAssignment: CanvasAssignment) => {
    setAssignments((prev) => {
      // Remove any leftover mock sample assignments if present
      const cleanPrev = isMock ? prev.filter((a) => !a.id.startsWith('mock_')) : prev;
      const updated = [newAssignment, ...cleanPrev];
      return updated.sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );
    });
    setIsMock(false);
    setNoFeedUrl(false);
  };

  const currentAi = AI_PROVIDERS[preferredAi] || AI_PROVIDERS.gemini;

  return (
    <div className="min-h-screen bg-[#080A0F] text-slate-100 flex flex-col font-sans selection:bg-[#FF3B00]/30 selection:text-[#FF3B00]">
      <Navbar />

      <AddDeadlineModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdded={handleCustomAssignmentAdded}
      />

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 max-w-4xl mx-auto w-full">
        {/* Banner if Demo Mode / Feed URL missing */}
        {isMock && !loading && assignments.length > 0 && (
          <div className="mb-4 w-full max-w-md rounded-xl bg-amber-500/10 px-4 py-3 text-xs text-amber-300 flex items-center justify-between gap-3 border border-amber-500/20">
            <span>
              {noFeedUrl
                ? 'Showing sample data — add your Canvas feed in settings or click Add Task above.'
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

        {/* Header with Add Task Button */}
        <div className="flex items-center justify-between w-full max-w-md sm:max-w-lg mb-5 sm:mb-6">
          <div className="text-left">
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight font-display">
              What's due?
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Skip or send to {currentAi.name}
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-[#FF3B00] hover:bg-[#FF3B00]/90 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-[#FF3B00]/20 active:scale-95 transition-all font-display"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Add Task</span>
          </button>
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
