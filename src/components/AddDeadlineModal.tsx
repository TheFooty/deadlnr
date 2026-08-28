'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CanvasAssignment, TaskAttachment } from '@/lib/types';
import { previewFile } from '@/lib/file-utils';
import { Plus, X, BookOpen, Link2, UploadCloud, FileText, Eye, Sparkles, Zap } from 'lucide-react';

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
  const [showSmartPaste, setShowSmartPaste] = useState(false);
  const [smartText, setSmartText] = useState('');

  // Apply Platform Quick Presets (e.g. Kognity)
  const applyPreset = (platform: 'KOGNITY' | 'CANVAS' | 'CUSTOM') => {
    if (platform === 'KOGNITY') {
      setCourse('KOGNITY');
      if (!url) setUrl('https://app.kognity.com');
    } else if (platform === 'CANVAS') {
      setCourse('CANVAS');
    }
  };

  // Smart parse text copied from Kognity or assignment lists
  const handleSmartParse = () => {
    if (!smartText.trim()) return;

    const lines = smartText.trim().split('\n').map((l) => l.trim()).filter(Boolean);

    // Extract title (first line)
    if (lines.length > 0 && !title) {
      setTitle(lines[0]);
    }

    // Try extracting course/subject
    const kognitySubj = smartText.match(/(Biology|Chemistry|Physics|Math|History|English|Economics|Psychology|TOK|CAS|Spanish)/i);
    if (kognitySubj && !course) {
      setCourse(`KOGNITY - ${kognitySubj[0].toUpperCase()}`);
    } else if (!course && smartText.toLowerCase().includes('kognity')) {
      setCourse('KOGNITY');
    }

    // Try extracting due date
    const dateMatch = smartText.match(/(due|by|before)?\s*([A-Za-z]{3,9}\s+\d{1,2}(?:,\s*\d{4})?(?:\s+at\s+\d{1,2}:\d{2}\s*(?:am|pm)?)?)/i);
    if (dateMatch && dateMatch[2]) {
      const parsed = new Date(dateMatch[2]);
      if (!isNaN(parsed.getTime())) {
        setDueDate(parsed.toISOString().slice(0, 16));
      }
    }

    // Try extracting URL
    const urlMatch = smartText.match(/https?:\/\/[^\s]+/i);
    if (urlMatch && !url) {
      setUrl(urlMatch[0]);
    } else if (!url && smartText.toLowerCase().includes('kognity')) {
      setUrl('https://app.kognity.com');
    }

    // Set description as full text
    if (!description) {
      setDescription(smartText);
    }

    setShowSmartPaste(false);
    setSmartText('');
  };

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

    const dueMs = new Date(dueDate).getTime();
    if (isNaN(dueMs)) return;

    // Warn (but allow) past-due custom tasks
    const isPast = dueMs < Date.now();

    const newAssignment: CanvasAssignment = {
      id: `custom_${Date.now()}`,
      title: title.trim(),
      course: course.trim().toUpperCase() || 'CUSTOM',
      dueDate: new Date(dueMs).toISOString(),
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

  // Close on Escape
  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const isFormValid = title.trim().length > 0 && dueDate.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#08090a]/85 backdrop-blur-xl"
        >
          <motion.div
            initial={{ scale: 0.94, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-lg rounded-xl border border-white/[0.08] bg-[#191a1b] p-6 sm:p-8 shadow-black/80 space-y-5 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#5e6ad2]/15 text-[#828fff] border border-[#5e6ad2]/30">
                  <Plus className="h-5 w-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-white font-display tracking-tight">
                    Add New Deadline
                  </h3>
                  <p className="text-xs text-white/55">Add custom tasks, Kognity assignments, or Canvas items</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#08090a] border border-white/[0.1] text-white/55 hover:text-white hover:bg-white/[0.05] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Presets & Smart Paste Toggle */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-medium text-white/55 uppercase tracking-wider">
                  Quick Presets:
                </span>

                <button
                  type="button"
                  onClick={() => setShowSmartPaste(!showSmartPaste)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#27a644] hover:underline"
                >
                  <Zap className="h-3.5 w-3.5 text-[#27a644]" />
                  <span>{showSmartPaste ? 'Close Quick Paste' : 'Paste from Kognity'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('KOGNITY')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#00A4B8]/40 bg-[#00A4B8]/15 px-3 py-1.5 text-xs font-medium text-[#00A4B8] hover:bg-[#00A4B8]/25 transition-all"
                >
                  <span className="h-2 w-2 rounded-full bg-[#00A4B8]" />
                  <span>Kognity Task</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('CANVAS')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#5e6ad2]/40 bg-[#5e6ad2]/15 px-3 py-1.5 text-xs font-medium text-[#828fff] hover:bg-[#5e6ad2]/25 transition-all"
                >
                  <span className="h-2 w-2 rounded-full bg-[#5e6ad2]" />
                  <span>Canvas Task</span>
                </button>
              </div>
            </div>

            {/* Smart Paste Box */}
            <AnimatePresence>
              {showSmartPaste && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden rounded-lg border border-[#27a644]/30 bg-[#27a644]/5 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#27a644] flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" />
                      <span>Paste Kognity Assignment Details</span>
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Paste text copied from Kognity assignment (e.g., 'Biology SL Practice - Due Oct 24')..."
                    value={smartText}
                    onChange={(e) => setSmartText(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.1] bg-[#08090a] p-3 text-xs text-white placeholder-slate-600 focus:border-[#27a644] focus:outline-none resize-none"
                  />
                  <button
                    type="button"
                    onClick={handleSmartParse}
                    className="w-full rounded-xl bg-[#27a644] hover:bg-[#27a644]/90 py-2 text-xs font-medium text-[#08090a] font-display"
                  >
                    Auto-Fill Assignment Fields
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-medium text-white/80 uppercase tracking-wider mb-1.5">
                  Assignment Title <span className="text-[#828fff]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kognity Physics Section 3.2 Quiz"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.1] bg-[#08090a] px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-[#5e6ad2] focus:outline-none focus:ring-1 focus:ring-[#5e6ad2] transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-medium text-white/80 uppercase tracking-wider mb-1.5">
                    Course Code / Platform
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="KOGNITY"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      className="w-full rounded-lg border border-white/[0.1] bg-[#08090a] px-4 py-3 pl-10 text-sm text-white placeholder-slate-600 focus:border-[#5e6ad2] focus:outline-none transition-all uppercase"
                    />
                    <BookOpen className="absolute left-3.5 top-3.5 h-4 w-4 text-white/40" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-white/80 uppercase tracking-wider mb-1.5">
                    Due Date & Time <span className="text-[#828fff]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full rounded-lg border border-white/[0.1] bg-[#08090a] px-4 py-3 text-xs text-white focus:border-[#5e6ad2] focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-white/80 uppercase tracking-wider mb-1.5">
                  Description / Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter assignment requirements, rubric details, or notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.1] bg-[#08090a] p-4 text-xs sm:text-sm text-white placeholder-slate-600 focus:border-[#5e6ad2] focus:outline-none resize-none transition-all leading-relaxed"
                />
              </div>

              {/* Attachments Section during creation */}
              <div>
                <label className="block text-xs font-mono font-medium text-white/80 uppercase tracking-wider mb-1.5">
                  Attach Files (PDFs, Images, Rubrics)
                </label>
                <div className="space-y-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.1] bg-[#08090a] px-3.5 py-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="h-4 w-4 text-[#27a644] shrink-0" />
                        <span className="font-semibold text-white/90 truncate">{att.name}</span>
                        <span className="text-[10px] text-white/40 font-mono">
                          ({(att.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => previewFile(att)}
                          className="text-xs text-[#27a644] hover:underline flex items-center gap-1 font-medium"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Preview</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="text-white/40 hover:text-rose-400 p-1"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-white/[0.12] hover:border-[#5e6ad2] bg-[#08090a]/60 p-3.5 cursor-pointer text-xs text-white/55 hover:text-white transition-all">
                    <UploadCloud className="h-4 w-4 text-[#828fff]" />
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
                <label className="block text-xs font-mono font-medium text-white/80 uppercase tracking-wider mb-1.5">
                  Resource Link (Optional)
                </label>
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://app.kognity.com..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.1] bg-[#08090a] px-4 py-3 pl-10 text-xs text-white placeholder-slate-600 focus:border-[#5e6ad2] focus:outline-none transition-all font-mono"
                  />
                  <Link2 className="absolute left-3.5 top-3.5 h-4 w-4 text-white/40" />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-[#08090a] hover:bg-white/[0.06] px-5 py-3 text-xs font-medium text-white/55 hover:text-white border border-white/[0.1] transition-all"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!isFormValid}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#5e6ad2] hover:bg-[#5e6ad2]/90 px-6 py-3 text-xs sm:text-sm font-medium text-white active:scale-95 transition-all font-display disabled:opacity-40 disabled:cursor-not-allowed"
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
