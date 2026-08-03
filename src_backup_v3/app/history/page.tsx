'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { SwipeEvent } from '@/lib/types';
import { History, ArrowRight, X, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function HistoryPage() {
  const [history, setHistory] = useState<SwipeEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    let localEvents: SwipeEvent[] = [];

    // 1. Read local storage first
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('deadlnr_swipe_history');
        if (stored) localEvents = JSON.parse(stored);
      } catch {
        // Ignore
      }
    }

    try {
      const res = await fetch('/api/swipe');
      if (res.ok) {
        const data = await res.json();
        const apiEvents: SwipeEvent[] = data.history || [];

        // Combine local storage and API history
        const combined = [...apiEvents, ...localEvents];
        const unique = Array.from(
          new Map(combined.map((item) => [`${item.assignment_id}_${item.swiped_at}`, item])).values()
        );

        setHistory(unique);

        if (typeof window !== 'undefined' && unique.length > 0) {
          localStorage.setItem('deadlnr_swipe_history', JSON.stringify(unique.slice(0, 50)));
        }
      } else {
        setHistory(localEvents);
      }
    } catch (err) {
      console.error('Failed to load swipe history:', err);
      setHistory(localEvents);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-[#080A0F] text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto w-full p-4 sm:p-6 md:p-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-white">Swipe History</h1>
              <p className="text-xs text-slate-400">Review your past skipped and AI-started assignments</p>
            </div>
          </div>

          <button
            onClick={fetchHistory}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-slate-800 bg-[#111622]/40">
            <RefreshCw className="h-8 w-8 text-[#FF3B00] animate-spin mb-2" />
            <p className="text-xs text-slate-400">Loading swipe log...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-slate-800 bg-[#111622]/40 p-6 text-center">
            <History className="h-10 w-10 text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Swipes Recorded Yet</h3>
            <p className="text-xs text-slate-400 max-w-xs mb-4">
              Start swiping on assignments on the main deck to build your activity history.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#FF3B00] hover:bg-[#FF3B00]/90 px-4 py-2 text-xs font-bold text-white shadow-lg"
            >
              <span>Go to Swipe Deck</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item, idx) => {
              const isRight = item.direction === 'right';

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-[#111622]/60 p-4 backdrop-blur-md"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                        isRight
                          ? 'border-[#00E599]/30 bg-[#00E599]/10 text-[#00E599]'
                          : 'border-[#FF0055]/30 bg-[#FF0055]/10 text-[#FF0055]'
                      }`}
                    >
                      {isRight ? <ArrowRight className="h-5 w-5" /> : <X className="h-5 w-5" />}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white line-clamp-1">{item.assignment_title}</h4>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                        <span className="text-slate-300 font-semibold">{item.course}</span>
                        {item.swiped_at && (
                          <>
                            <span>·</span>
                            <span>
                              {new Date(item.swiped_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${
                      isRight ? 'text-[#00E599]' : 'text-[#FF0055]'
                    }`}
                  >
                    {isRight ? 'Started' : 'Skipped'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
