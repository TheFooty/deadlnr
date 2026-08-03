'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Copy, Sparkles, ExternalLink, X } from 'lucide-react';

interface ToastProps {
  message: string | null;
  subtext?: string | null;
  onClose: () => void;
}

export function Toast({ message, subtext, onClose }: ToastProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 w-[90%] max-w-md"
        >
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/40 bg-slate-900/95 p-4 shadow-2xl shadow-emerald-950/50 backdrop-blur-xl">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="h-5 w-5" />
            </div>

            <div className="flex-1 text-sm">
              <div className="flex items-center gap-1.5 font-extrabold text-white">
                <Copy className="h-4 w-4 text-emerald-400" />
                <span>{message}</span>
              </div>
              {subtext && <p className="mt-0.5 text-xs text-slate-300 font-medium">{subtext}</p>}
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
