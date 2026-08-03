'use client';

import React from 'react';
import { CanvasAssignment } from '@/lib/types';
import {
  getSmartTitleFormat,
  getSmartDescFormat,
  getSmartCourseFormat,
} from '@/lib/smart-format';
import { Clock, ExternalLink, BookOpen, AlertTriangle } from 'lucide-react';

interface AssignmentCardProps {
  assignment: CanvasAssignment;
  isFrontCard?: boolean;
}

// Course pill styling based on course code
function getCourseTheme(courseName: string) {
  const name = courseName.toUpperCase();
  if (name.includes('CS') || name.includes('COMP') || name.includes('CODE')) {
    return 'bg-[#00E599]/10 border-[#00E599]/30 text-[#00E599]';
  }
  if (name.includes('MATH') || name.includes('STAT') || name.includes('CALC')) {
    return 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400';
  }
  if (name.includes('PHYS') || name.includes('CHEM') || name.includes('BIO')) {
    return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400';
  }
  if (name.includes('ENGL') || name.includes('RHET') || name.includes('LIT')) {
    return 'bg-purple-500/10 border-purple-500/30 text-purple-400';
  }
  if (name.includes('HIST') || name.includes('GOV') || name.includes('POLI')) {
    return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
  }
  return 'bg-[#FF3B00]/10 border-[#FF3B00]/30 text-[#FF3B00]';
}

export function AssignmentCard({ assignment, isFrontCard = false }: AssignmentCardProps) {
  // Smart formatting calculations
  const { codeTag, fullName } = getSmartCourseFormat(assignment.course);
  const smartTitle = getSmartTitleFormat(assignment.title);
  const smartDesc = getSmartDescFormat(assignment.description);
  const themeClass = getCourseTheme(assignment.course);

  // Format due date into clean status text
  const formatDueDate = (dateStr: string) => {
    const due = new Date(dateStr);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) return { statusText: 'Past Due', isUrgent: true };
    if (diffHours < 24) return { statusText: `Due in ${diffHours}h`, isUrgent: true };
    if (diffDays < 3) return { statusText: `Due in ${diffDays}d`, isUrgent: false };
    return {
      statusText: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      isUrgent: false,
    };
  };

  const { statusText, isUrgent } = formatDueDate(assignment.dueDate);
  const isSparseDescription = !assignment.description || assignment.description.trim().length < 20;

  return (
    <div
      className={`relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[2.25rem] border border-slate-800 bg-[#111622] p-6 sm:p-8 lg:p-9 shadow-2xl select-none card-tactile ${
        isFrontCard ? 'card-tactile-active border-slate-700/80' : ''
      }`}
    >
      {/* Top Section */}
      <div className="flex-1 flex flex-col justify-between">
        {/* Header: Clean Course Code Tag + Due Status Badge */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs sm:text-sm font-mono font-bold uppercase tracking-wider ${themeClass}`}
            >
              <BookOpen className="h-4 w-4" />
              <span>{codeTag}</span>
            </span>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs sm:text-sm font-mono font-bold ${
                isUrgent
                  ? 'bg-[#FF0055]/15 text-[#FF0055] border border-[#FF0055]/30 animate-pulse'
                  : 'bg-slate-900 text-slate-300 border border-slate-800'
              }`}
            >
              <Clock className="h-4 w-4" />
              {statusText}
            </span>
          </div>

          {/* Optional Full Course Name Eyebrow */}
          {fullName && (
            <p className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 line-clamp-1">
              {fullName}
            </p>
          )}

          {/* Smart Dynamic Title */}
          <h2 className={`text-white leading-tight font-display mb-4 ${smartTitle.fontSizeClass}`}>
            {assignment.title}
          </h2>
        </div>

        {/* Smart Dynamic Description */}
        <div className="my-auto py-2">
          {isSparseDescription ? (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5 text-center">
              <AlertTriangle className="mx-auto h-6 w-6 text-amber-400 mb-2 opacity-90" />
              <p className="text-xs sm:text-sm text-slate-400">
                Sparse details in calendar feed. Click below to view full instructions on Canvas LMS.
              </p>
            </div>
          ) : (
            <div className={`space-y-3 ${smartDesc.fontSizeClass} ${smartDesc.lineHeightClass}`}>
              {smartDesc.paragraphs.slice(0, 3).map((para, idx) => (
                <p key={idx} className="line-clamp-4">
                  {para}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer: Action Link */}
      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs sm:text-sm mt-4">
        {assignment.canvasUrl ? (
          <a
            href={assignment.canvasUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 font-bold text-slate-200 border border-slate-800 transition-colors shadow-sm"
          >
            <span>Open in Canvas</span>
            <ExternalLink className="h-4 w-4 text-slate-400" />
          </a>
        ) : (
          <span className="text-slate-500 italic text-xs">No link</span>
        )}
      </div>
    </div>
  );
}
