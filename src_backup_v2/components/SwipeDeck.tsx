'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CanvasAssignment, PreferredAI, AI_PROVIDERS } from '@/lib/types';
import { AssignmentCard } from './AssignmentCard';
import { Toast } from './Toast';
import { useDevice } from '@/lib/use-device';
import { X, Check, RotateCcw, CheckCircle2, History } from 'lucide-react';
import Link from 'next/link';

interface SwipeDeckProps {
  initialAssignments: CanvasAssignment[];
  preferredAi: PreferredAI;
  isMockData?: boolean;
  onRefreshFeed?: () => void;
}

export function SwipeDeck({
  initialAssignments,
  preferredAi,
  isMockData = false,
  onRefreshFeed,
}: SwipeDeckProps) {
  const [deck, setDeck] = useState<CanvasAssignment[]>(initialAssignments);
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [historyCount, setHistoryCount] = useState({ left: 0, right: 0 });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastSubtext, setToastSubtext] = useState<string | null>(null);

  // State for < 12 hours urgent swipe-left confirmation
  const [pendingSkip, setPendingSkip] = useState<{
    assignment: CanvasAssignment;
    hoursLeft: number;
  } | null>(null);

  // Device detection hook
  const { isPhone, isTablet, isDesktop } = useDevice();

  useEffect(() => {
    setDeck(initialAssignments);
  }, [initialAssignments]);

  const currentAi = AI_PROVIDERS[preferredAi] || AI_PROVIDERS.gemini;

  // Haptic feedback for mobile
  const triggerHaptic = (pattern: number | number[] = 20) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore
      }
    }
  };

  // Log swipe to server
  const logSwipe = async (assignment: CanvasAssignment, direction: 'left' | 'right') => {
    try {
      await fetch('/api/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_id: assignment.id,
          assignment_title: assignment.title,
          course: assignment.course,
          direction,
        }),
      });
    } catch (err) {
      console.error('Failed to log swipe:', err);
    }
  };

  // Execute actual left swipe animation
  const executeSwipeLeft = useCallback((targetAssignment: CanvasAssignment) => {
    setSwipingId(targetAssignment.id);
    setSwipeOffset(-320);

    triggerHaptic(15);
    logSwipe(targetAssignment, 'left');
    setHistoryCount((prev) => ({ ...prev, left: prev.left + 1 }));

    setTimeout(() => {
      setDeck((prev) => prev.slice(1));
      setSwipingId(null);
      setSwipeOffset(0);
      setPendingSkip(null);
    }, 200);
  }, []);

  // Execute right swipe (launch AI with estimated completion time request in prompt)
  const executeSwipeRight = useCallback(
    (targetAssignment: CanvasAssignment) => {
      setSwipingId(targetAssignment.id);
      setSwipeOffset(320);

      triggerHaptic([30, 50, 30]);

      const formattedDate = new Date(targetAssignment.dueDate).toLocaleString();

      // Formatted prompt asking for estimated completion time at the beginning
      const promptText = `Help me get started on this assignment. Please first provide an estimated completion time for this task, then give me a step-by-step breakdown to complete it efficiently. Here's everything I know about it:

Title: ${targetAssignment.title}
Course: ${targetAssignment.course}
Due Date: ${formattedDate}

Description:
${targetAssignment.description || 'Sparse description in calendar feed. Check Canvas URL below.'}

Canvas Direct Link: ${targetAssignment.canvasUrl || 'N/A'}`;

      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(promptText);
      }

      setToastMessage(`Copied context for ${currentAi.name}.`);
      setToastSubtext(`Launching ${currentAi.name} in a new tab...`);
      window.open(currentAi.url, '_blank');

      logSwipe(targetAssignment, 'right');
      setHistoryCount((prev) => ({ ...prev, right: prev.right + 1 }));

      setTimeout(() => {
        setToastMessage(null);
        setToastSubtext(null);
      }, 4000);

      setTimeout(() => {
        setDeck((prev) => prev.slice(1));
        setSwipingId(null);
        setSwipeOffset(0);
      }, 200);
    },
    [currentAi]
  );

  // Main swipe handler (checks if < 12h due date requires confirmation)
  const handleSwipe = useCallback(
    (direction: 'left' | 'right') => {
      if (deck.length === 0 || swipingId || pendingSkip) return;

      const targetAssignment = deck[0];

      if (direction === 'left') {
        const dueMs = new Date(targetAssignment.dueDate).getTime() - Date.now();
        const hoursLeft = dueMs / (1000 * 60 * 60);

        // Check if due in under 12 hours
        if (hoursLeft > 0 && hoursLeft < 12) {
          setPendingSkip({
            assignment: targetAssignment,
            hoursLeft: Math.max(1, Math.round(hoursLeft)),
          });
          return;
        }

        executeSwipeLeft(targetAssignment);
      } else {
        executeSwipeRight(targetAssignment);
      }
    },
    [deck, swipingId, pendingSkip, executeSwipeLeft, executeSwipeRight]
  );

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (deck.length === 0 || swipingId || pendingSkip) return;
      if (e.key === 'ArrowLeft') {
        handleSwipe('left');
      } else if (e.key === 'ArrowRight') {
        handleSwipe('right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deck, swipingId, pendingSkip, handleSwipe]);

  // Confetti on clear
  useEffect(() => {
    if (deck.length === 0 && initialAssignments.length > 0) {
      confetti({
        particleCount: isPhone ? 60 : 100,
        spread: 75,
        origin: { y: 0.55 },
        colors: ['#FF3B00', '#00E599', '#FF0055', '#FFB703'],
      });
    }
  }, [deck.length, initialAssignments.length, isPhone]);

  const activeCard = deck[0];
  const totalSwiped = historyCount.left + historyCount.right;

  const deckContainerClass = isPhone
    ? 'h-[460px] w-full max-w-sm'
    : isTablet
    ? 'h-[520px] w-full max-w-md'
    : 'h-[570px] w-full max-w-lg lg:max-w-xl';

  const dragThreshold = isPhone ? 70 : 90;

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-2xl mx-auto">
      {/* Toast Notification */}
      <Toast message={toastMessage} subtext={toastSubtext} onClose={() => setToastMessage(null)} />

      {/* Urgent Swipe-Left Confirmation Modal (< 12 hours) */}
      <AnimatePresence>
        {pendingSkip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080A0F]/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
              className="w-full max-w-sm rounded-2xl border border-slate-800 bg-[#111622] p-6"
            >
              <p className="text-sm text-[#FF0055] font-bold mb-1">
                Due in {pendingSkip.hoursLeft} {pendingSkip.hoursLeft === 1 ? 'hour' : 'hours'}
              </p>

              <h3 className="text-lg font-bold text-white mb-2">
                Skip "{pendingSkip.assignment.title}"?
              </h3>
              <p className="text-sm text-slate-400 mb-6">
                This is due soon. Are you sure you want to skip it?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => executeSwipeLeft(pendingSkip.assignment)}
                  className="flex-1 rounded-xl bg-[#FF0055] hover:bg-[#FF0055]/90 py-2.5 text-sm font-semibold text-white active:scale-95 transition-all"
                >
                  Skip anyway
                </button>

                <button
                  onClick={() => setPendingSkip(null)}
                  className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 py-2.5 text-sm font-semibold text-slate-300 active:scale-95 transition-all"
                >
                  Keep it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Metrics */}
      <div className="w-full flex items-center justify-between px-2 mb-3 text-xs text-slate-500">
        <span>{deck.length} remaining</span>

        {totalSwiped > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[#FF0055]">✕ {historyCount.left}</span>
            <span className="text-slate-700">·</span>
            <span className="text-[#00E599]">✓ {historyCount.right}</span>
          </div>
        )}
      </div>

      {/* Main Card Stack Container */}
      <div className={`relative ${deckContainerClass} my-2`}>
        {deck.length > 0 ? (
          <div className="relative w-full h-full overflow-hidden rounded-[2.25rem]">
            {deck.slice(0, 3).map((assignment, index) => {
              const isTop = index === 0;
              const isExiting = isTop && swipingId === assignment.id;

              return (
                <motion.div
                  key={assignment.id}
                  style={{ zIndex: 30 - index }}
                  initial={{ scale: 0.88, y: 32, opacity: 1 }}
                  animate={
                    isExiting
                      ? {
                          x: swipeOffset,
                          opacity: 0,
                          scale: 0.9,
                          rotate: swipeOffset < 0 ? -15 : 15,
                        }
                      : {
                          x: 0,
                          scale: isTop ? 1 : index === 1 ? 0.94 : 0.88,
                          y: isTop ? 0 : index === 1 ? 16 : 32,
                          opacity: 1,
                          rotate: 0,
                        }
                  }
                  transition={{ duration: isExiting ? 0.2 : 0.25, ease: 'easeOut' }}
                  drag={isTop && !swipingId ? 'x' : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.8}
                  onDragEnd={(_, info) => {
                    if (!isTop || swipingId) return;
                    if (info.offset.x < -dragThreshold || info.velocity.x < -300) {
                      handleSwipe('left');
                    } else if (info.offset.x > dragThreshold || info.velocity.x > 300) {
                      handleSwipe('right');
                    }
                  }}
                  className="absolute inset-0 cursor-grab active:cursor-grabbing touch-none select-none"
                >
                  <AssignmentCard assignment={assignment} isFrontCard={isTop} />
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* Empty Deck State */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex h-full w-full flex-col items-center justify-center rounded-[2.25rem] border border-slate-800 bg-[#111622] p-8 sm:p-10 text-center card-tactile"
          >
            <div className="text-[#00E599] mb-5">
              <CheckCircle2 className="h-12 w-12 stroke-[2]" />
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-white font-display mb-1.5">
              All clear
            </h3>
            <p className="text-sm text-slate-500 max-w-xs mb-8">
              Nothing due. Reload your feed or check back later.
            </p>

            <div className="flex flex-col w-full gap-3 max-w-xs">
              <button
                onClick={() => {
                  if (onRefreshFeed) onRefreshFeed();
                  setDeck(initialAssignments);
                }}
                className="w-full rounded-xl bg-[#FF3B00] hover:bg-[#FF3B00]/90 px-6 py-3 font-semibold text-white active:scale-95 transition-all text-sm"
              >
                Reload deck
              </button>

              <Link
                href="/history"
                className="w-full inline-flex items-center justify-center rounded-xl bg-[#111622] hover:bg-slate-800 px-6 py-2.5 font-semibold text-slate-400 border border-slate-800 transition-colors text-sm"
              >
                View history
              </Link>
            </div>
          </motion.div>
        )}
      </div>

      {/* Action Controls */}
      {deck.length > 0 && (
        <div className="flex items-center justify-center gap-6 sm:gap-10 mt-6 z-40">
          {/* Skip Button */}
          <button
            onClick={() => handleSwipe('left')}
            disabled={!!swipingId}
            title="Skip / Dismiss (Left Arrow)"
            className="group flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-2xl border border-[#FF0055]/30 bg-[#111622] text-[#FF0055] transition-all hover:bg-[#FF0055] hover:text-white hover:border-[#FF0055] active:scale-90 disabled:opacity-50"
          >
            <X className="h-8 w-8 sm:h-9 sm:w-9 stroke-[2.5]" />
          </button>

          {/* Reset Stack */}
          <button
            onClick={() => setDeck(initialAssignments)}
            disabled={!!swipingId}
            title="Reset Stack"
            className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl border border-slate-800 bg-[#111622] text-slate-500 hover:text-white hover:bg-slate-800 active:scale-90 transition-all disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* Start AI Button */}
          <button
            onClick={() => handleSwipe('right')}
            disabled={!!swipingId}
            title={`Start with ${currentAi.name} (Right Arrow)`}
            className="group flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-2xl border border-[#00E599]/30 bg-[#111622] text-[#00E599] transition-all hover:bg-[#00E599] hover:text-[#080A0F] hover:border-[#00E599] active:scale-90 disabled:opacity-50"
          >
            <Check className="h-8 w-8 sm:h-9 sm:w-9 stroke-[3]" />
          </button>
        </div>
      )}

      {/* Keyboard Hint (desktop only) */}
      {deck.length > 0 && isDesktop && (
        <div className="mt-5 text-xs text-slate-600">
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 text-[10px]">←</kbd>
          {' '}skip{' · '}
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 text-[10px]">→</kbd>
          {' '}{currentAi.name}
        </div>
      )}
    </div>
  );
}
