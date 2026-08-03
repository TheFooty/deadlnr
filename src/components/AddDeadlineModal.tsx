'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CanvasAssignment } from '@/lib/types';
import { Plus, X, Calendar, BookOpen, Link2, FileText, Check } from 'lucide-react';

interface AddDeadlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded: (newAssignment: CanvasAssignment) => void;
}

export function AddDeadlineModal({ isOpen, onClose, onAdded }: AddDeadlineModalProps) {
  const [title, setTitle] = useState('');
  const [course, setCourse] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    const newAssignment: CanvasAssignment = {
      id: `custom_${Date.now()}`,
      title: title.trim(),
      course: course.trim() || 'PERSONAL',
      dueDate: new Date(dueDate).toISOString(),
      description: description.trim(),
      canvasUrl: url.trim(),
    };

    // Save to localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('deadlnr_custom_assignments');
        const customList: CanvasAssignment[] = stored ? JSON.parse(stored) : [];
        customList.unshift(newAssignment);
        localStorage.setItem('deadlnr_custom_assignments', JSON.stringify(customList));
      } catch {}
    }

    onAdded(newAssignment);

    // Reset form
    setTitle('');
    setCourse('');
    setDueDate('');
    setDescription('');
    setUrl('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080A0F]/85 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 20 }}
            className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#111622] p-6 sm:p-8 shadow-2xl space-y-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF3B00]/10 text-[#FF3B00] border border-[#FF3B00]/20">
                  <Plus className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-extrabold text-white font-display">
                  Add Custom Deadline
                </h3>
              </div>

              <button
                onClick={onClose}
                className="rounded-xl bg-slate-900 border border-slate-800 p-1.5 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assignment / Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Physics Midterm Study Guide"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-[#FF3B00] focus:outline-none focus:ring-1 focus:ring-[#FF3B00]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Course / Category
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. PHYS 201"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 pl-9 text-sm text-white placeholder-slate-500 focus:border-[#FF3B00] focus:outline-none"
                    />
                    <BookOpen className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Due Date & Time *
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-[#FF3B00] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description / Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Additional details or instructions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-[#FF3B00] focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Resource / Direct Link (Optional)
                </label>
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://canvas.university.edu/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 pl-9 text-xs text-white placeholder-slate-500 focus:border-[#FF3B00] focus:outline-none"
                  />
                  <Link2 className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-500" />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-300 border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#FF3B00] hover:bg-[#FF3B00]/90 px-5 py-2.5 text-xs font-bold text-white shadow-lg active:scale-95 transition-all font-display"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Deadline</span>
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
