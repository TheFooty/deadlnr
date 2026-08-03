'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { SwipeEvent } from '@/lib/types';
import { History, Sparkles, X, ArrowLeft, RefreshCw, BookOpen, Clock } from 'lucide-react';
import Link from 'next/link';

export default function HistoryPage() {
  const [history, setHistory] = useState<SwipeEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/swipe');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Failed to load swipe history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
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
          <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/40">
            <RefreshCw className="h-8 w-8 text-orange-400 animate-spin mb-2" />
            <p className="text-xs text-slate-400">Loading swipe log...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/40 p-6 text-center">
            <History className="h-10 w-10 text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Swipes Recorded Yet</h3>
            <p className="text-xs text-slate-400 max-w-xs mb-4">
              Start swiping on assignments on the main deck to build your activity history.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-lg"
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
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                        isRight
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {isRight ? <Sparkles className="h-5 w-5" /> : <X className="h-5 w-5" />}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white line-clamp-1">{item.assignment_title}</h4>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                        <span className="flex items-center gap-1 text-slate-300">
                          <BookOpen className="h-3 w-3 text-orange-400" />
                          {item.course}
                        </span>
                        {item.swiped_at && (
                          <span className="flex items-center gap-1 text-slate-400">
                            <Clock className="h-3 w-3" />
                            {new Date(item.swiped_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border ${
                      isRight
                        ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                        : 'border-rose-500/40 bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {isRight ? 'Started in AI' : 'Skipped'}
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
