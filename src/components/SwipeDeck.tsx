'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CanvasAssignment, PreferredAI, AI_PROVIDERS } from '@/lib/types';
import { previewFile } from '@/lib/file-utils';
import { AssignmentCard, getCourseTheme } from './AssignmentCard';
import { Toast } from './Toast';
import { useDevice } from '@/lib/use-device';
import {
  X,
  Check,
  RotateCcw,
  CheckCircle2,
  History as HistoryIcon,
  Layers,
  AlertTriangle,
  Clock,
  ExternalLink,
  Sparkles,
  CheckCircle,
  Paperclip,
  Eye,
  Download,
  LayoutGrid,
} from 'lucide-react';
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
  const [deck, setDeck] = useState<CanvasAssignment[]>([]);
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [historyCount, setHistoryCount] = useState({ left: 0, right: 0 });
  const [hasSwipedAny, setHasSwipedAny] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastSubtext, setToastSubtext] = useState<string | null>(null);

  // Overview Modal state
  const [showOverview, setShowOverview] = useState<boolean>(false);

  // State for < 12 hours urgent swipe-left confirmation
  const [pendingSkip, setPendingSkip] = useState<{
    assignment: CanvasAssignment;
    hoursLeft: number;
  } | null>(null);

  // State for Swipe Right Focus / Detail modal ("I've Done It!")
  const [activeDetailAssignment, setActiveDetailAssignment] = useState<CanvasAssignment | null>(null);

  const { isPhone, isTablet, isDesktop } = useDevice();

  // Load deck & filter out swiped IDs (persisted across refreshes)
  // Mock sample cards are NEVER persisted — they always come back on reload
  useEffect(() => {
    const isMockId = (id: string) => id.startsWith('mock-') || id.startsWith('mock_');

    if (typeof window !== 'undefined') {
      try {
        let swipedArr: string[] = [];
        const storedSwiped = localStorage.getItem('deadlnr_swiped_ids_persistent');
        swipedArr = storedSwiped ? JSON.parse(storedSwiped) : [];

        const storedHistory = localStorage.getItem('deadlnr_swipe_history');
        if (storedHistory) {
          const historyList: any[] = JSON.parse(storedHistory);
          historyList.forEach((h: any) => {
            if (h.assignment_id && !swipedArr.includes(h.assignment_id)) {
              swipedArr.push(h.assignment_id);
            }
          });
        }

        // Drop mock IDs from the persistent filter — samples should re-appear
        const realSwiped = swipedArr.filter((id) => !isMockId(id));
        if (realSwiped.length !== swipedArr.length) {
          localStorage.setItem('deadlnr_swiped_ids_persistent', JSON.stringify(realSwiped));
        }
        swipedArr = realSwiped;

        const swipedSet = new Set(swipedArr);
        const unswiped = initialAssignments.filter(
          (a) => !swipedSet.has(a.id) || isMockId(a.id)
        );
        setDeck(unswiped);
        return;
      } catch {}
    }
    setDeck(initialAssignments);
  }, [initialAssignments]);

  // Escalating Scared Deadline Email Notifications starting 3 days before deadline
  useEffect(() => {
    async function sendEmailNotifications() {
      if (typeof window !== 'undefined' && localStorage.getItem('deadlnr_email_reminders') === 'false') {
        return; // Email reminders disabled by user in settings
      }
      if (initialAssignments.length > 0) {
        try {
          await fetch('/api/notifications/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assignments: initialAssignments }),
          });
        } catch (err) {}
      }
    }
    sendEmailNotifications();
  }, [initialAssignments]);

  const currentAi = AI_PROVIDERS[preferredAi] || AI_PROVIDERS.gemini;

  // Haptic feedback for mobile
  const triggerHaptic = (pattern: number | number[] = 20) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }
  };

  // Helper to record swiped assignment ID in persistent storage
  const markSwipedPersistent = (assignmentId: string) => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('deadlnr_swiped_ids_persistent');
        const swipedArr: string[] = stored ? JSON.parse(stored) : [];
        if (!swipedArr.includes(assignmentId)) {
          swipedArr.push(assignmentId);
          localStorage.setItem('deadlnr_swiped_ids_persistent', JSON.stringify(swipedArr));
        }
        sessionStorage.setItem('deadlnr_swiped_ids', JSON.stringify(swipedArr));
      } catch {}
    }
  };

  // Deduplicated Log swipe to server & localStorage
  const logSwipe = async (assignment: CanvasAssignment, direction: 'left' | 'right') => {
    markSwipedPersistent(assignment.id);
    setHasSwipedAny(true);

    const newEvent = {
      assignment_id: assignment.id,
      assignment_title: assignment.title,
      course: assignment.course,
      direction,
      swiped_at: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('deadlnr_swipe_history');
        const history = stored ? JSON.parse(stored) : [];
        const filtered = history.filter((item: any) => item.assignment_id !== assignment.id);
        filtered.unshift(newEvent);
        localStorage.setItem('deadlnr_swipe_history', JSON.stringify(filtered.slice(0, 50)));
      } catch {}
    }

    try {
      await fetch('/api/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent),
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
      setDeck((prev) => prev.filter((a) => a.id !== targetAssignment.id));
      setSwipingId(null);
      setSwipeOffset(0);
      setPendingSkip(null);
    }, 200);
  }, []);

  // Swipe right handler opens Detail Focus Modal
  const executeSwipeRight = useCallback(
    (targetAssignment: CanvasAssignment) => {
      triggerHaptic([30, 50, 30]);
      setActiveDetailAssignment(targetAssignment);
    },
    []
  );

  // Jump chosen card from Overview directly to top of deck
  const handleSelectFromOverview = (selectedAssignment: CanvasAssignment) => {
    setDeck((prev) => {
      const remaining = prev.filter((a) => a.id !== selectedAssignment.id);
      return [selectedAssignment, ...remaining];
    });
    setShowOverview(false);
    setActiveDetailAssignment(selectedAssignment);
  };

  // Quick X out / dismiss an assignment directly from Grid Overview
  const handleQuickDismiss = (targetAssignment: CanvasAssignment) => {
    triggerHaptic(15);
    logSwipe(targetAssignment, 'left');
    setHistoryCount((prev) => ({ ...prev, left: prev.left + 1 }));
    setDeck((prev) => prev.filter((a) => a.id !== targetAssignment.id));
    setToastMessage(`Dismissed "${targetAssignment.title}"`);
    setToastSubtext('Removed from deck');
    setTimeout(() => {
      setToastMessage(null);
      setToastSubtext(null);
    }, 2500);
  };

  // Handle "I've Done It!" Completion Button Click
  const handleMarkAsDone = (targetAssignment: CanvasAssignment) => {
    confetti({
      particleCount: isPhone ? 80 : 120,
      spread: 90,
      origin: { y: 0.6 },
      colors: ['#27a644', '#5e6ad2', '#3B82F6', '#FFB703', '#A855F7'],
    });

    logSwipe(targetAssignment, 'right');
    setHistoryCount((prev) => ({ ...prev, right: prev.right + 1 }));

    setToastMessage(`🎉 Completed "${targetAssignment.title}"!`);
    setToastSubtext('Great job knocking out that deadline!');

    setDeck((prev) => prev.filter((a) => a.id !== targetAssignment.id));
    setActiveDetailAssignment(null);

    setTimeout(() => {
      setToastMessage(null);
      setToastSubtext(null);
    }, 4000);
  };

  // Handle Launching AI Assistant from Detail Modal
  const handleLaunchAiFromModal = (targetAssignment: CanvasAssignment) => {
    let aiTab: Window | null = null;
    try {
      aiTab = window.open('about:blank', '_blank');
    } catch {}

    const formattedDate = new Date(targetAssignment.dueDate).toLocaleString();

    let attachmentsText = '';
    if (targetAssignment.attachments && targetAssignment.attachments.length > 0) {
      attachmentsText = `\nAttached Files: ${targetAssignment.attachments.map((a) => a.name).join(', ')}`;
    }

    const promptText = `Help me get started on this assignment. Please first provide an estimated completion time for this task, then give me a step-by-step breakdown to complete it efficiently. Here's everything I know about it:

Title: ${targetAssignment.title}
Course: ${targetAssignment.course}
Due Date: ${formattedDate}${attachmentsText}

Description:
${targetAssignment.description || 'Sparse description in calendar feed. Check Canvas URL below.'}

Canvas Direct Link: ${targetAssignment.canvasUrl || 'N/A'}`;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(promptText).catch(() => {});
    }

    setToastMessage(`Copied context for ${currentAi.name}.`);
    setToastSubtext(`Launching ${currentAi.name} in a new tab...`);

    if (aiTab) {
      aiTab.location.href = currentAi.url;
    } else {
      window.open(currentAi.url, '_blank');
    }

    logSwipe(targetAssignment, 'right');
    setHistoryCount((prev) => ({ ...prev, right: prev.right + 1 }));

    setDeck((prev) => prev.filter((a) => a.id !== targetAssignment.id));
    setActiveDetailAssignment(null);

    setTimeout(() => {
      setToastMessage(null);
      setToastSubtext(null);
    }, 4000);
  };

  // Main swipe handler (checks if < 12h due date requires confirmation)
  const handleSwipe = useCallback(
    (direction: 'left' | 'right') => {
      if (deck.length === 0 || swipingId || pendingSkip || activeDetailAssignment) return;

      const targetAssignment = deck[0];

      if (direction === 'left') {
        const dueMs = new Date(targetAssignment.dueDate).getTime() - Date.now();
        const hoursLeft = dueMs / (1000 * 60 * 60);

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
    [deck, swipingId, pendingSkip, activeDetailAssignment, executeSwipeLeft, executeSwipeRight]
  );

  // Explicit reload deck handler
  const handleReloadDeck = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('deadlnr_swiped_ids');
    }
    if (onRefreshFeed) onRefreshFeed();
    setDeck(initialAssignments);
    setHasSwipedAny(false);
  };

  // Keyboard controls for deck swiping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc closes any open modal first
      if (e.key === 'Escape') {
        if (activeDetailAssignment) setActiveDetailAssignment(null);
        else if (pendingSkip) setPendingSkip(null);
        else if (showOverview) setShowOverview(false);
        return;
      }
      if (showOverview || activeDetailAssignment || pendingSkip) return;
      if (deck.length === 0 || swipingId) return;
      if (e.key === 'ArrowLeft') {
        handleSwipe('left');
      } else if (e.key === 'ArrowRight') {
        handleSwipe('right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deck, swipingId, pendingSkip, activeDetailAssignment, showOverview, handleSwipe]);

  // Lock background scroll while a modal is open
  useEffect(() => {
    const modalOpen = showOverview || !!activeDetailAssignment || !!pendingSkip;
    document.body.style.overflow = modalOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showOverview, activeDetailAssignment, pendingSkip]);

  // Confetti on clear ONLY if user actually swiped cards in this session!
  useEffect(() => {
    if (hasSwipedAny && deck.length === 0 && initialAssignments.length > 0) {
      confetti({
        particleCount: isPhone ? 60 : 100,
        spread: 75,
        origin: { y: 0.55 },
        colors: ['#5e6ad2', '#27a644', '#dc2626', '#FFB703'],
      });
    }
  }, [deck.length, initialAssignments.length, hasSwipedAny, isPhone]);

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

      {/* FULL DECK GRID OVERVIEW MODAL */}
      <AnimatePresence>
        {showOverview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-between p-4 sm:p-6 bg-[#08090a]/95 backdrop-blur-2xl overflow-y-auto"
          >
            {/* Overview Header */}
            <div className="w-full max-w-5xl flex items-center justify-between py-3 border-b border-white/[0.1] mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#5e6ad2]/15 text-[#828fff] border border-[#5e6ad2]/30">
                  <LayoutGrid className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-medium text-white font-display">
                    Deck Overview
                  </h2>
                  <p className="text-xs text-white/55">
                    {deck.length} card{deck.length === 1 ? '' : 's'} remaining • Click card to focus or ✕ to dismiss
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowOverview(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.1] text-white/55 hover:text-white hover:bg-white/[0.05] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Overview Content Body - Pure Clean Grid View */}
            <div className="flex-1 w-full max-w-5xl flex flex-col items-center justify-start py-2">
              {deck.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-white/55 text-sm">No cards remaining in your deck!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full py-4">
                  <AnimatePresence mode="popLayout">
                    {deck.map((item, idx) => {
                      const theme = getCourseTheme(item.course);
                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
                          onClick={() => handleSelectFromOverview(item)}
                          whileHover={{ scale: 1.02, y: -4 }}
                          className={`cursor-pointer rounded-lg border bg-[#191a1b] p-5 transition-all card-tactile group flex flex-col justify-between ${theme.border} relative`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3 gap-2">
                              <span className={`inline-flex items-center gap-1.5 text-xs font-mono font-medium px-2.5 py-1 rounded-full border ${theme.text} ${theme.bg} ${theme.border} truncate max-w-[65%]`}>
                                <span className={`h-2 w-2 rounded-full shrink-0 ${theme.dot}`} />
                                <span className="truncate">{item.course}</span>
                              </span>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-xs text-white/40 font-mono font-medium">#{idx + 1}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickDismiss(item);
                                  }}
                                  title="Dismiss / X out assignment"
                                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] border border-white/[0.1] text-white/55 hover:text-red-400 hover:bg-red-500/15 hover:border-red-500/30 active:scale-90 transition-all"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            <h4 className="text-white font-medium text-base font-display mb-2 group-hover:text-[#828fff] transition-colors leading-snug">
                              {item.title}
                            </h4>

                            <p className="text-xs text-white/55 line-clamp-3 leading-relaxed mb-4">
                              {item.description || 'No detailed instructions provided in calendar feed.'}
                            </p>
                          </div>

                          <div className="space-y-3 pt-3 border-t border-white/[0.1]/80">
                            {item.attachments && item.attachments.length > 0 && (
                              <div className="inline-flex items-center gap-1 text-[11px] font-mono text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-xl border border-cyan-500/20">
                                <Paperclip className="h-3 w-3 text-cyan-400" />
                                <span>{item.attachments.length} attached file(s)</span>
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <span className="text-xs text-white/55 font-mono">
                                Due: <strong className="text-white/90">{new Date(item.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</strong>
                              </span>
                              <span className={`text-xs font-medium ${theme.text} group-hover:underline font-display`}>
                                Focus Card →
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Overview Footer */}
            <div className="w-full max-w-5xl flex items-center justify-between pt-3 border-t border-white/[0.1] shrink-0">
              <span className="text-xs text-white/55 font-mono">
                Tip: Click any card above to bring it to the top of your deck
              </span>
              <button
                onClick={() => setShowOverview(false)}
                className="rounded-xl bg-white/[0.06] border border-white/[0.1] px-4 py-2 text-xs font-medium text-white hover:bg-white/[0.05] transition-colors"
              >
                Back to Deck
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swipe Right Focus / Detail Modal ("I've Done It!") */}
      <AnimatePresence>
        {activeDetailAssignment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#08090a]/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              className="w-full max-w-lg rounded-xl border border-white/[0.1] bg-[#191a1b] p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-medium uppercase tracking-wider text-[#27a644] bg-[#27a644]/10 px-3 py-1 rounded-full border border-[#27a644]/20">
                  {activeDetailAssignment.course}
                </span>

                <button
                  onClick={() => setActiveDetailAssignment(null)}
                  className="rounded-xl bg-white/[0.06] border border-white/[0.1] p-1.5 text-white/55 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <h3 className="text-2xl font-medium text-white font-display leading-tight mb-2">
                  {activeDetailAssignment.title}
                </h3>
                <p className="text-xs text-white/55">
                  Due: {new Date(activeDetailAssignment.dueDate).toLocaleString()}
                </p>
              </div>

              <div className="rounded-lg border border-white/[0.1] bg-white/[0.03]/80 p-4 text-xs sm:text-sm text-white/80 space-y-2 leading-relaxed">
                <p className="font-medium text-white/90">Assignment Details:</p>
                <p className="whitespace-pre-line text-white/55">
                  {activeDetailAssignment.description || 'No detailed instructions provided in calendar feed. Open Canvas for full details.'}
                </p>
              </div>

              {/* Attached Files List in Detail Modal */}
              {activeDetailAssignment.attachments && activeDetailAssignment.attachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-mono font-medium text-white/55 uppercase tracking-wider">
                    Attached Files ({activeDetailAssignment.attachments.length}):
                  </p>
                  <div className="space-y-1.5">
                    {activeDetailAssignment.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-2.5 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Paperclip className="h-3.5 w-3.5 text-[#27a644] shrink-0" />
                          <span className="font-semibold text-white/90 truncate">{att.name}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            type="button"
                            onClick={() => previewFile(att)}
                            className="text-[#27a644] hover:underline font-medium inline-flex items-center gap-1 text-xs"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Preview</span>
                          </button>
                          <a
                            href={att.dataUrl}
                            download={att.name}
                            className="text-white/55 hover:text-white hover:underline text-xs flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            <span>Download</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => handleMarkAsDone(activeDetailAssignment)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#27a644] hover:bg-[#27a644]/90 py-3.5 text-xs sm:text-sm font-medium text-[#08090a] active:scale-95 transition-all font-display"
                >
                  <CheckCircle className="h-4 w-4 stroke-[2.5]" />
                  <span>I&apos;ve Done It! 🎉</span>
                </button>

                <button
                  onClick={() => handleLaunchAiFromModal(activeDetailAssignment)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#5e6ad2] hover:bg-[#5e6ad2]/90 py-3.5 text-xs sm:text-sm font-medium text-white active:scale-95 transition-all font-display"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Ask {currentAi.name}</span>
                </button>
              </div>

              {activeDetailAssignment.canvasUrl && (
                <div className="text-center pt-1">
                  <a
                    href={activeDetailAssignment.canvasUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/80 underline underline-offset-2"
                  >
                    <span>Open in Canvas LMS</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Urgent Swipe-Left Confirmation Modal (< 12 hours) */}
      <AnimatePresence>
        {pendingSkip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#08090a]/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 0 }}
              className="w-full max-w-md rounded-xl border border-[#dc2626]/40 bg-[#191a1b] p-6 card-tactile"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#dc2626]/15 text-[#dc2626] border border-[#dc2626]/30 mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#dc2626]/15 text-[#dc2626] border border-[#dc2626]/30 text-xs font-mono font-medium mb-2">
                <Clock className="h-3.5 w-3.5" />
                <span>Due in {pendingSkip.hoursLeft} hours!</span>
              </div>

              <h3 className="text-xl font-medium text-white font-display mb-2">
                Urgent Deadline Warning
              </h3>
              <p className="text-xs sm:text-sm text-white/80 mb-6 leading-relaxed">
                <strong className="text-white">&quot;{pendingSkip.assignment.title}&quot;</strong> is due in under 12 hours. Are you sure you want to skip it?
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => executeSwipeLeft(pendingSkip.assignment)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#dc2626] hover:bg-[#dc2626]/90 py-3 text-xs sm:text-sm font-medium text-white active:scale-95 transition-all font-display"
                >
                  <X className="h-4 w-4" />
                  <span>Yes, Skip for Now</span>
                </button>

                <button
                  onClick={() => setPendingSkip(null)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.05] border border-white/[0.1] py-3 text-xs sm:text-sm font-medium text-white/90 active:scale-95 transition-all"
                >
                  <span>No, Keep on Deck</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Metric & Overview Trigger */}
      <div className="w-full flex items-center justify-between px-2 mb-3 text-xs font-mono font-medium text-white/55">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white/[0.06] px-3 py-1 rounded-full border border-white/[0.1]">
            <Layers className="h-3.5 w-3.5 text-[#828fff]" />
            <span>{deck.length} remaining</span>
          </div>

          {deck.length > 0 && (
            <button
              onClick={() => setShowOverview(true)}
              className="inline-flex items-center gap-1.5 bg-[#5e6ad2]/15 hover:bg-[#5e6ad2]/25 text-[#828fff] border border-[#5e6ad2]/30 px-3 py-1 rounded-full transition-all active:scale-95"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Deck Overview</span>
            </button>
          )}
        </div>

        {totalSwiped > 0 && (
          <div className="flex items-center gap-2 bg-white/[0.06] px-3 py-1 rounded-full border border-white/[0.1]">
            <span className="text-[#dc2626]">✕ {historyCount.left}</span>
            <span className="text-white/30">•</span>
            <span className="text-[#27a644]">✓ {historyCount.right}</span>
          </div>
        )}
      </div>

      {/* Main Card Stack Container */}
      <div className={`relative ${deckContainerClass} my-2`}>
        {deck.length > 0 ? (
          <div className="relative w-full h-full overflow-hidden rounded-xl">
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
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex h-full w-full flex-col items-center justify-center rounded-xl border border-white/[0.1] bg-[#191a1b] p-8 sm:p-10 text-center backdrop-blur-xl card-tactile"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-tr from-[#27a644] to-teal-400 p-3 text-[#08090a] shadow-[#27a644]/20 mb-4 animate-bounce">
              <CheckCircle2 className="h-10 w-10 stroke-[2.5]" />
            </div>

            <h3 className="text-2xl sm:text-2xl font-medium text-white font-display mb-1.5">
              Deadlnr&apos;s clear — nothing due
            </h3>
            <p className="text-xs sm:text-sm text-white/55 max-w-xs mb-6 leading-relaxed">
              All upcoming deadlines triaged! Take a break or reload your Canvas feed for updates.
            </p>

            <div className="flex flex-col w-full gap-3 max-w-xs">
              <button
                onClick={handleReloadDeck}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#5e6ad2] hover:bg-[#5e6ad2]/90 px-6 py-3 font-medium text-white shadow-[#5e6ad2]/20 active:scale-95 transition-all text-sm font-display"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reload Deck</span>
              </button>

              <Link
                href="/history"
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#191a1b] hover:bg-white/[0.05] px-6 py-2.5 font-medium text-white/80 border border-white/[0.1] transition-colors text-xs"
              >
                <HistoryIcon className="h-3.5 w-3.5 text-[#828fff]" />
                <span>View Activity History</span>
              </Link>
            </div>
          </motion.div>
        )}
      </div>

      {/* Action Controls */}
      {deck.length > 0 && (
        <div className="actions-row flex items-center justify-center gap-6 sm:gap-10 mt-6 z-40">
          <button
            onClick={() => handleSwipe('left')}
            disabled={!!swipingId}
            title="Skip / Dismiss (Left Arrow)"
            className="group flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-lg border border-[#dc2626]/40 bg-[#191a1b] text-[#dc2626] transition-all hover:bg-[#dc2626] hover:text-white hover:border-[#dc2626] active:scale-90 disabled:opacity-50"
          >
            <X className="h-8 w-8 sm:h-9 sm:w-9 stroke-[2.5]" />
          </button>

          <button
            onClick={handleReloadDeck}
            disabled={!!swipingId}
            title="Reload Deck"
            className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-lg border border-white/[0.1] bg-[#191a1b] text-white/55 hover:text-white hover:bg-white/[0.05] active:scale-90 transition-all disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          <button
            onClick={() => handleSwipe('right')}
            disabled={!!swipingId}
            title={`View Details & Complete (Right Arrow)`}
            className="group flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-lg border border-[#27a644]/40 bg-[#191a1b] text-[#27a644] transition-all hover:bg-[#27a644] hover:text-[#08090a] hover:border-[#27a644] active:scale-90 disabled:opacity-50"
          >
            <Check className="h-8 w-8 sm:h-9 sm:w-9 stroke-[3]" />
          </button>
        </div>
      )}

      {/* Helper Banner */}
      {deck.length > 0 && (
        <div className="mt-5 flex items-center gap-2 text-xs font-mono font-medium text-white/55 bg-white/[0.05] px-3.5 py-1.5 rounded-full border border-white/[0.1]">
          {isDesktop ? (
            <>
              <span>Press</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] text-white/90 border border-white/[0.12] font-mono text-[10px]">←</kbd>
              <span>to skip or</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] text-white/90 border border-white/[0.12] font-mono text-[10px]">→</kbd>
              <span>for Details & Completion</span>
            </>
          ) : (
            <span>Swipe left to skip • Swipe right for Details & Completion</span>
          )}
        </div>
      )}
    </div>
  );
}
