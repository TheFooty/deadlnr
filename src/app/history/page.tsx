'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Toast } from '@/components/Toast';
import { SwipeEvent } from '@/lib/types';
import { History, ArrowRight, X, ArrowLeft, RefreshCw, Undo2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function HistoryPage() {
  const [history, setHistory] = useState<SwipeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastSubtext, setToastSubtext] = useState<string | null>(null);

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
          new Map(combined.map((item) => [item.assignment_id, item])).values()
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

  // Restore Task back to Deck (resets 24h attachment purge timer and brings back task to deck)
  const handleRestoreTask = async (assignmentId: string, assignmentTitle: string) => {
    // 1. Update UI state
    setHistory((prev) => prev.filter((item) => item.assignment_id !== assignmentId));

    // 2. Remove from persistent swipe records so it reappears on refresh
    if (typeof window !== 'undefined') {
      try {
        const storedHistory = localStorage.getItem('deadlnr_swipe_history');
        if (storedHistory) {
          const list: SwipeEvent[] = JSON.parse(storedHistory);
          const filtered = list.filter((item) => item.assignment_id !== assignmentId);
          localStorage.setItem('deadlnr_swipe_history', JSON.stringify(filtered));
        }

        const storedSwiped = localStorage.getItem('deadlnr_swiped_ids_persistent');
        if (storedSwiped) {
          const swipedArr: string[] = JSON.parse(storedSwiped);
          const filteredArr = swipedArr.filter((id) => id !== assignmentId);
          localStorage.setItem('deadlnr_swiped_ids_persistent', JSON.stringify(filteredArr));
        }

        const swipedRaw = sessionStorage.getItem('deadlnr_swiped_ids');
        if (swipedRaw) {
          const swipedArr: string[] = JSON.parse(swipedRaw);
          const filteredArr = swipedArr.filter((id) => id !== assignmentId);
          sessionStorage.setItem('deadlnr_swiped_ids', JSON.stringify(filteredArr));
        }
      } catch {}
    }

    // 3. Call DELETE API route to clear server/cookie history
    try {
      await fetch(`/api/swipe?assignment_id=${encodeURIComponent(assignmentId)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to restore task on server:', err);
    }

    setToastMessage(`Restored "${assignmentTitle}"!`);
    setToastSubtext('This assignment is back on your deck with full attachments.');

    setTimeout(() => {
      setToastMessage(null);
      setToastSubtext(null);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-[#08090a] text-white/95 flex flex-col font-sans">
      <Navbar />

      <Toast message={toastMessage} subtext={toastSubtext} onClose={() => setToastMessage(null)} />

      <main className="flex-1 max-w-3xl mx-auto w-full p-4 sm:p-6 md:p-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.1] text-white/55 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-medium text-white font-display">Swipe History</h1>
              <p className="text-xs text-white/55">Review completed tasks or restore mistakenly swiped items</p>
            </div>
          </div>

          <button
            onClick={fetchHistory}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.1] text-white/55 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-white/[0.1] bg-[#191a1b]/40">
            <RefreshCw className="h-8 w-8 text-[#828fff] animate-spin mb-2" />
            <p className="text-xs text-white/55">Loading swipe log…</p>
          </div>
        ) : history.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-white/[0.1] bg-[#191a1b]/40 p-6 text-center">
            <History className="h-10 w-10 text-white/30 mb-3" />
            <h3 className="text-base font-medium text-white mb-1">No Swipes Recorded Yet</h3>
            <p className="text-xs text-white/55 max-w-xs mb-4">
              Start swiping on assignments on the main deck to build your activity history.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#5e6ad2] hover:bg-[#5e6ad2]/90 px-4 py-2 text-xs font-medium text-white font-display"
            >
              <span>Go to Swipe Deck</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Stats Dashboard */}
            {(() => {
              const completed = history.filter((i) => i.direction === 'right').length;
              const skipped = history.filter((i) => i.direction === 'left').length;
              const total = history.length;
              const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

              // Last 7 days activity (oldest -> newest)
              const dayLabels: string[] = [];
              const dayCounts: number[] = [];
              for (let d = 6; d >= 0; d--) {
                const day = new Date();
                day.setHours(0, 0, 0, 0);
                day.setDate(day.getDate() - d);
                const next = new Date(day);
                next.setDate(next.getDate() + 1);
                const count = history.filter((i) => {
                  if (!i.swiped_at) return false;
                  const t = new Date(i.swiped_at);
                  return t >= day && t < next;
                }).length;
                dayLabels.push(day.toLocaleDateString(undefined, { weekday: 'short' }));
                dayCounts.push(count);
              }
              const maxDay = Math.max(...dayCounts, 1);

              return (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-white/[0.1] bg-[#191a1b] p-4 card-tactile">
                      <p className="text-[11px] uppercase tracking-wider text-white/40 font-mono font-medium">Completed</p>
                      <p className="text-2xl sm:text-2xl font-medium text-[#27a644] font-display mt-1">{completed}</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.1] bg-[#191a1b] p-4 card-tactile">
                      <p className="text-[11px] uppercase tracking-wider text-white/40 font-mono font-medium">Skipped</p>
                      <p className="text-2xl sm:text-2xl font-medium text-[#FF2D6B] font-display mt-1">{skipped}</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.1] bg-[#191a1b] p-4 card-tactile">
                      <p className="text-[11px] uppercase tracking-wider text-white/40 font-mono font-medium">Done Rate</p>
                      <p className="text-2xl sm:text-2xl font-medium text-white font-display mt-1">{rate}%</p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/[0.1] bg-[#191a1b] p-4 card-tactile">
                    <p className="text-[11px] uppercase tracking-wider text-white/40 font-mono font-medium mb-3">Last 7 Days</p>
                    <div className="flex items-end gap-2 h-24">
                      {dayCounts.map((count, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                          <span className="text-[10px] font-mono font-medium text-white/55">{count > 0 ? count : ''}</span>
                          <div
                            className={`w-full rounded-t-md transition-all ${count > 0 ? 'bg-[#27a644]' : 'bg-white/[0.05]'}`}
                            style={{ height: `${Math.max((count / maxDay) * 100, 4)}%` }}
                          />
                          <span className="text-[10px] text-white/40 font-mono">{dayLabels[idx]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}

            <div className="space-y-3">
            {history.map((item) => {
              const isRight = item.direction === 'right';

              return (
                <div
                  key={item.assignment_id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-white/[0.1] bg-[#191a1b]/80 p-4 backdrop-blur-md hover:border-white/[0.12] transition-all card-tactile"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                        isRight
                          ? 'border-[#27a644]/30 bg-[#27a644]/10 text-[#27a644]'
                          : 'border-[#dc2626]/30 bg-[#dc2626]/10 text-[#dc2626]'
                      }`}
                    >
                      {isRight ? <CheckCircle2 className="h-5 w-5" /> : <X className="h-5 w-5" />}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-sm font-medium text-white truncate">{item.assignment_title}</h4>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-white/55">
                        <span className="text-[#27a644] font-mono font-medium uppercase text-[10px]">
                          {item.course}
                        </span>
                        {item.swiped_at && (
                          <>
                            <span>·</span>
                            <span className="text-[11px]">
                              {new Date(item.swiped_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        isRight ? 'text-[#27a644] bg-[#27a644]/10' : 'text-[#dc2626] bg-[#dc2626]/10'
                      }`}
                    >
                      {isRight ? 'Completed 🎉' : 'Skipped'}
                    </span>

                    <button
                      onClick={() => handleRestoreTask(item.assignment_id, item.assignment_title)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.05] border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-white/90 hover:text-white transition-all active:scale-95"
                      title="Restore task to active deck"
                    >
                      <Undo2 className="h-3.5 w-3.5 text-[#828fff]" />
                      <span className="hidden sm:inline">Restore to Deck</span>
                    </button>
                  </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
