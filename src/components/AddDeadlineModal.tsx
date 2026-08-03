'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CanvasAssignment, TaskAttachment } from '@/lib/types';
import { previewFile } from '@/lib/file-utils';
import { Plus, X, BookOpen, Link2, UploadCloud, FileText, Eye } from 'lucide-react';

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
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newAtt: TaskAttachment = {
          id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl,
        };
        setAttachments((prev) => [...prev, newAtt]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    const newAssignment: CanvasAssignment = {
      id: `custom_${Date.now()}`,
      title: title.trim(),
      course: course.trim().toUpperCase() || 'CUSTOM',
      dueDate: new Date(dueDate).toISOString(),
      description: description.trim(),
      canvasUrl: url.trim(),
      attachments,
      isCustom: true,
    };

    // Save to localStorage & sync across user account
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('deadlnr_custom_assignments');
        const customList: CanvasAssignment[] = stored ? JSON.parse(stored) : [];
        customList.unshift(newAssignment);
        localStorage.setItem('deadlnr_custom_assignments', JSON.stringify(customList));

        // Sync custom assignments list to server user_settings / cookies
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ custom_assignments: customList }),
        }).catch(() => {});
      } catch {}
    }

    onAdded(newAssignment);

    // Reset form
    setTitle('');
    setCourse('');
    setDueDate('');
    setDescription('');
    setUrl('');
    setAttachments([]);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080A0F]/85 backdrop-blur-xl"
        >
          <motion.div
            initial={{ scale: 0.94, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-lg rounded-[2rem] border border-white/[0.08] bg-[#111622] p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FF3B00]/15 text-[#FF3B00] border border-[#FF3B00]/30">
                  <Plus className="h-5 w-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white font-display tracking-tight">
                    Add New Deadline
                  </h3>
                  <p className="text-xs text-slate-400">Manually insert a task into your swipe deck</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#080A0F] border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Assignment Title <span className="text-[#FF3B00]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Physics Lab Report 4"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-[#080A0F] px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-[#FF3B00] focus:outline-none focus:ring-1 focus:ring-[#FF3B00] transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Course Code
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="PHYS 201"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      className="w-full rounded-2xl border border-slate-800 bg-[#080A0F] px-4 py-3 pl-10 text-sm text-white placeholder-slate-600 focus:border-[#FF3B00] focus:outline-none transition-all uppercase"
                    />
                    <BookOpen className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Due Date & Time <span className="text-[#FF3B00]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full rounded-2xl border border-slate-800 bg-[#080A0F] px-4 py-3 text-xs text-white focus:border-[#FF3B00] focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Description / Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter assignment requirements, rubric details, or notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-[#080A0F] p-4 text-xs sm:text-sm text-white placeholder-slate-600 focus:border-[#FF3B00] focus:outline-none resize-none transition-all leading-relaxed"
                />
              </div>

              {/* Attachments Section during creation */}
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Attach Files (PDFs, Images, Rubrics)
                </label>
                <div className="space-y-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#080A0F] px-3.5 py-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="h-4 w-4 text-[#00E599] shrink-0" />
                        <span className="font-semibold text-slate-200 truncate">{att.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({(att.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => previewFile(att)}
                          className="text-xs text-[#00E599] hover:underline flex items-center gap-1 font-bold"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Preview</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <label className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-700 hover:border-[#FF3B00] bg-[#080A0F]/60 p-3.5 cursor-pointer text-xs text-slate-400 hover:text-white transition-all">
                    <UploadCloud className="h-4 w-4 text-[#FF3B00]" />
                    <span>Upload attachment files</span>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Resource Link (Optional)
                </label>
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full rounded-2xl border border-slate-800 bg-[#080A0F] px-4 py-3 pl-10 text-xs text-white placeholder-slate-600 focus:border-[#FF3B00] focus:outline-none transition-all font-mono"
                  />
                  <Link2 className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl bg-[#080A0F] hover:bg-slate-900 px-5 py-3 text-xs font-bold text-slate-400 hover:text-white border border-slate-800 transition-all"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#FF3B00] hover:bg-[#FF3B00]/90 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-xl shadow-[#FF3B00]/20 active:scale-95 transition-all font-display"
                >
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                  <span>Add to Deck</span>
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
