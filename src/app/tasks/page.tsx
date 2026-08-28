'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { AddDeadlineModal } from '@/components/AddDeadlineModal';
import { CanvasAssignment, TaskAttachment } from '@/lib/types';
import { previewFile } from '@/lib/file-utils';
import {
  ListTodo,
  Plus,
  Search,
  Edit2,
  Trash2,
  Paperclip,
  Calendar,
  X,
  UploadCloud,
  FileText,
  ExternalLink,
  Eye,
  Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TasksPage() {
  const [assignments, setAssignments] = useState<CanvasAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('ALL');

  // Add Task Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Edit Task State
  const [editingTask, setEditingTask] = useState<CanvasAssignment | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCourse, setEditCourse] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editAttachments, setEditAttachments] = useState<TaskAttachment[]>([]);

  // Load custom assignments and Canvas feed
  const loadTasks = async () => {
    setLoading(true);
    try {
      let customList: CanvasAssignment[] = [];
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('deadlnr_custom_assignments');
          if (stored) customList = JSON.parse(stored);
        } catch {}
      }

      // Also try fetching from API settings/feed
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (Array.isArray(settingsData.custom_assignments) && settingsData.custom_assignments.length > 0) {
          // Merge server custom assignments if larger
          const serverList: CanvasAssignment[] = settingsData.custom_assignments;
          const mergedMap = new Map<string, CanvasAssignment>();
          [...customList, ...serverList].forEach((item) => mergedMap.set(item.id, item));
          customList = Array.from(mergedMap.values());
          if (typeof window !== 'undefined') {
            localStorage.setItem('deadlnr_custom_assignments', JSON.stringify(customList));
          }
        }
      }

      // Fetch Canvas feed
      const feedRes = await fetch('/api/canvas/feed');
      const feedData = await feedRes.json();
      const canvasList: CanvasAssignment[] = feedData.assignments || [];

      // Combine custom & Canvas lists
      const combinedMap = new Map<string, CanvasAssignment>();
      customList.forEach((item) => combinedMap.set(item.id, { ...item, isCustom: true }));
      canvasList.forEach((item) => {
        if (!combinedMap.has(item.id)) {
          combinedMap.set(item.id, item);
        }
      });

      const combined = Array.from(combinedMap.values()).sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );

      setAssignments(combined);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // Open Edit Modal for a Task
  const handleOpenEdit = (task: CanvasAssignment) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditCourse(task.course);
    setEditDueDate(new Date(task.dueDate).toISOString().slice(0, 16));
    setEditDescription(task.description || '');
    setEditUrl(task.canvasUrl || '');
    setEditAttachments(task.attachments || []);
  };

  // Helper to sync custom tasks locally and to server account
  const syncCustomTasks = (customList: CanvasAssignment[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('deadlnr_custom_assignments', JSON.stringify(customList));
    }
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom_assignments: customList }),
    }).catch(() => {});
  };

  // File Upload Handler
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
        setEditAttachments((prev) => [...prev, newAtt]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveAttachment = (id: string) => {
    setEditAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Save Edit Task
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    const updatedTask: CanvasAssignment = {
      ...editingTask,
      title: editTitle.trim(),
      course: editCourse.trim().toUpperCase() || 'CUSTOM',
      dueDate: new Date(editDueDate).toISOString(),
      description: editDescription.trim(),
      canvasUrl: editUrl.trim(),
      attachments: editAttachments,
      isCustom: true,
    };

    setAssignments((prev) =>
      prev.map((item) => (item.id === editingTask.id ? updatedTask : item))
    );

    // Save to localStorage & sync to server
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('deadlnr_custom_assignments');
        let customList: CanvasAssignment[] = stored ? JSON.parse(stored) : [];
        const index = customList.findIndex((item) => item.id === editingTask.id);
        if (index !== -1) {
          customList[index] = updatedTask;
        } else {
          customList.unshift(updatedTask);
        }
        syncCustomTasks(customList);
      } catch {}
    }

    setEditingTask(null);
  };

  // Delete Task
  const handleDeleteTask = (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    setAssignments((prev) => prev.filter((t) => t.id !== taskId));

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('deadlnr_custom_assignments');
        let customList: CanvasAssignment[] = stored ? JSON.parse(stored) : [];
        const filtered = customList.filter((item) => item.id !== taskId);
        syncCustomTasks(filtered);
      } catch {}
    }
  };

  // Filter courses & search query
  const courses = Array.from(new Set(assignments.map((a) => a.course)));
  const filteredAssignments = assignments.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = selectedCourse === 'ALL' || a.course === selectedCourse;
    return matchesSearch && matchesCourse;
  });

  // Split into upcoming vs past-due
  const upcoming = filteredAssignments.filter((a) => new Date(a.dueDate).getTime() >= Date.now());
  const pastDue = filteredAssignments.filter((a) => new Date(a.dueDate).getTime() < Date.now());

  // Close edit modal on Escape
  React.useEffect(() => {
    if (!editingTask) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditingTask(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingTask]);

  // Render a single task row
  const renderTask = (task: CanvasAssignment) => {
    const dueMs = new Date(task.dueDate).getTime();
    const hoursLeft = Math.round((dueMs - Date.now()) / (1000 * 60 * 60));

    return (
      <div
        key={task.id}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-white/[0.1] bg-[#191a1b] p-5 hover:border-white/[0.12] transition-all card-tactile"
      >
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-[#27a644] bg-[#27a644]/10 px-2.5 py-0.5 rounded border border-[#27a644]/20">
              {task.course}
            </span>
            {task.attachments && task.attachments.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                <Paperclip className="h-3 w-3" />
                <span>{task.attachments.length} files</span>
              </span>
            )}
            {task.isCustom && (
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Custom
              </span>
            )}
          </div>

          <h3 className="text-base font-medium text-white truncate">{task.title}</h3>

          <div className="flex items-center gap-3 text-xs text-white/55">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-white/40" />
              <span>{new Date(task.dueDate).toLocaleString()}</span>
            </span>
            <span>·</span>
            <span className={hoursLeft < 24 ? 'text-rose-400 font-medium' : 'text-white/55'}>
              {hoursLeft > 0 ? `${hoursLeft}h left` : 'Past due'}
            </span>
          </div>

          {task.attachments && task.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {task.attachments.map((att) => (
                <button
                  key={att.id}
                  onClick={() => previewFile(att)}
                  className="inline-flex items-center gap-1 rounded-xl bg-white/[0.06] border border-white/[0.1] px-2.5 py-1 text-[11px] font-semibold text-[#27a644] hover:border-[#27a644]/40 transition-all"
                >
                  <Eye className="h-3 w-3" />
                  <span className="truncate max-w-[120px]">{att.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleOpenEdit(task)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.05] border border-white/[0.12] px-4 py-2.5 text-xs font-medium text-white/90 transition-all"
          >
            <Edit2 className="h-3.5 w-3.5 text-[#27a644]" />
            <span>Edit & Attach</span>
          </button>

          {task.canvasUrl && (
            <a
              href={task.canvasUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.1] text-white/55 hover:text-white hover:bg-white/[0.05] transition-colors"
              title="Open Canvas Link"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#08090a] text-white/95 flex flex-col font-sans">
      <Navbar />

      <AddDeadlineModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdded={() => loadTasks()}
      />

      {/* Edit Task Modal */}
      <AnimatePresence>
        {editingTask && (
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
              className="w-full max-w-xl rounded-xl border border-white/[0.08] bg-[#191a1b] p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#5e6ad2]/15 text-[#828fff] border border-[#5e6ad2]/30">
                    <Edit2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-white font-display">
                      Edit Task Details
                    </h3>
                    <p className="text-xs text-white/55">Update deadline, course info, or attach files</p>
                  </div>
                </div>

                <button
                  onClick={() => setEditingTask(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#08090a] border border-white/[0.1] text-white/55 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-medium text-white/80 uppercase tracking-wider mb-1.5">
                    Assignment Title
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.1] bg-[#08090a] px-4 py-3 text-sm text-white focus:border-[#5e6ad2] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono font-medium text-white/80 uppercase tracking-wider mb-1.5">
                      Course Code
                    </label>
                    <input
                      type="text"
                      value={editCourse}
                      onChange={(e) => setEditCourse(e.target.value)}
                      className="w-full rounded-lg border border-white/[0.1] bg-[#08090a] px-4 py-3 text-sm text-white focus:border-[#5e6ad2] focus:outline-none uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-medium text-white/80 uppercase tracking-wider mb-1.5">
                      Due Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="w-full rounded-lg border border-white/[0.1] bg-[#08090a] px-4 py-3 text-xs text-white focus:border-[#5e6ad2] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-white/80 uppercase tracking-wider mb-1.5">
                    Description / Instructions
                  </label>
                  <textarea
                    rows={4}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.1] bg-[#08090a] p-4 text-xs text-white focus:border-[#5e6ad2] focus:outline-none resize-none leading-relaxed"
                  />
                </div>

                {/* File Attachments Uploader */}
                <div>
                  <label className="block text-xs font-mono font-medium text-white/80 uppercase tracking-wider mb-1.5">
                    File Attachments (PDFs, Rubrics, Images)
                  </label>

                  <div className="space-y-3">
                    {/* Attachment List */}
                    {editAttachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.1] bg-[#08090a] px-4 py-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <FileText className="h-4 w-4 text-[#27a644] shrink-0" />
                          <span className="font-semibold text-white/90 truncate">{att.name}</span>
                          <span className="text-[10px] text-white/40 font-mono">
                            ({(att.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => previewFile(att)}
                            className="text-xs text-[#27a644] hover:underline flex items-center gap-1 font-medium"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Preview</span>
                          </button>
                          <a
                            href={att.dataUrl}
                            download={att.name}
                            className="text-xs text-white/55 hover:text-white hover:underline flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            <span>Download</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(att.id)}
                            className="text-white/40 hover:text-rose-400 p-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* File Upload Trigger */}
                    <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-white/[0.12] hover:border-[#5e6ad2] bg-[#08090a]/60 p-4 cursor-pointer text-xs text-white/55 hover:text-white transition-all">
                      <UploadCloud className="h-4 w-4 text-[#828fff]" />
                      <span>Click or drop files to upload attachments</span>
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
                  <input
                    type="url"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.1] bg-[#08090a] px-4 py-3 text-xs text-white focus:border-[#5e6ad2] focus:outline-none font-mono"
                  />
                </div>

                <div className="pt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(editingTask.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-4 py-3 text-xs font-medium transition-all border border-rose-500/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Task</span>
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingTask(null)}
                      className="rounded-lg bg-[#08090a] px-5 py-3 text-xs font-medium text-white/55 hover:text-white border border-white/[0.1]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-[#5e6ad2] hover:bg-[#5e6ad2]/90 px-6 py-3 text-xs font-medium text-white shadow-[#5e6ad2]/20 font-display"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 md:p-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#5e6ad2]/15 text-[#828fff] border border-[#5e6ad2]/30">
                <ListTodo className="h-5 w-5" />
              </div>
              <h1 className="text-2xl sm:text-2xl font-medium text-white font-display">
                Tasks & File Attachments
              </h1>
            </div>
            <p className="text-xs text-white/55 mt-1">
              Edit task parameters, attach assignment files, or upload study rubrics.
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#5e6ad2] hover:bg-[#5e6ad2]/90 px-5 py-2.5 text-xs sm:text-sm font-medium text-white shadow-[#5e6ad2]/20 active:scale-95 transition-all font-display self-start sm:self-auto"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Add New Task</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="Search by title, course, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-white/[0.1] bg-[#191a1b] px-4 py-3 pl-10 text-xs text-white placeholder-slate-500 focus:border-[#5e6ad2] focus:outline-none transition-all"
            />
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-white/40" />
          </div>

          {courses.length > 0 && (
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="rounded-lg border border-white/[0.1] bg-[#191a1b] px-4 py-3 text-xs text-white focus:border-[#5e6ad2] focus:outline-none font-mono"
            >
              <option value="ALL">All Courses ({assignments.length})</option>
              {courses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Task List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-white/[0.1] bg-[#191a1b] p-5 space-y-3">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-5 w-2/3" />
                <div className="skeleton h-3.5 w-1/3" />
              </div>
            ))}
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="flex h-64 w-full flex-col items-center justify-center rounded-xl border border-white/[0.1] bg-[#191a1b] p-8 text-center">
            <ListTodo className="h-10 w-10 text-white/30 mb-3" />
            <p className="text-base font-medium text-white mb-1">No tasks found</p>
            <p className="text-xs text-white/55 max-w-xs mb-4">
              Add a new task using the button above or connect your Canvas feed in Settings.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="rounded-xl bg-[#5e6ad2] px-4 py-2 text-xs font-medium text-white"
            >
              Add Task
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Upcoming Section */}
            <section>
              <h2 className="text-xs font-mono font-medium uppercase tracking-wider text-white/40 mb-3 px-1">
                Upcoming ({upcoming.length})
              </h2>
              <div className="space-y-3">
                {upcoming.length === 0 ? (
                  <p className="text-sm text-white/40 px-1 py-2">Nothing upcoming — you're clear.</p>
                ) : (
                  upcoming.map((task) => renderTask(task))
                )}
              </div>
            </section>

            {/* Past Due Section */}
            {pastDue.length > 0 && (
              <section>
                <h2 className="text-xs font-mono font-medium uppercase tracking-wider text-white/40 mb-3 px-1">
                  Past Due ({pastDue.length})
                </h2>
                <div className="space-y-3 opacity-70">
                  {pastDue.map((task) => renderTask(task))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
