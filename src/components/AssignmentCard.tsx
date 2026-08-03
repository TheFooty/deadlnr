'use client';

import React from 'react';
import { CanvasAssignment } from '@/lib/types';
import {
  getSmartTitleFormat,
  getSmartDescFormat,
  getSmartCourseFormat,
} from '@/lib/smart-format';
import { ExternalLink, Paperclip } from 'lucide-react';

interface AssignmentCardProps {
  assignment: CanvasAssignment;
  isFrontCard?: boolean;
}

// Course color dot based on course code
function getCourseTheme(courseName: string) {
  const name = courseName.toUpperCase();
  if (name.includes('CS') || name.includes('COMP') || name.includes('CODE')) {
    return { dot: 'bg-[#00E599]', text: 'text-[#00E599]' };
  }
  if (name.includes('MATH') || name.includes('STAT') || name.includes('CALC')) {
    return { dot: 'bg-indigo-400', text: 'text-indigo-400' };
  }
  if (name.includes('PHYS') || name.includes('CHEM') || name.includes('BIO')) {
    return { dot: 'bg-cyan-400', text: 'text-cyan-400' };
  }
  if (name.includes('ENGL') || name.includes('RHET') || name.includes('LIT')) {
    return { dot: 'bg-purple-400', text: 'text-purple-400' };
  }
  if (name.includes('HIST') || name.includes('GOV') || name.includes('POLI')) {
    return { dot: 'bg-amber-400', text: 'text-amber-400' };
  }
  return { dot: 'bg-[#FF3B00]', text: 'text-[#FF3B00]' };
}

export function AssignmentCard({ assignment, isFrontCard = false }: AssignmentCardProps) {
  // Smart formatting calculations
  const { codeTag, fullName } = getSmartCourseFormat(assignment.course);
  const smartTitle = getSmartTitleFormat(assignment.title);
  const smartDesc = getSmartDescFormat(assignment.description);
  const theme = getCourseTheme(assignment.course);

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
      className={`relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[2.25rem] border border-slate-800 bg-[#111622] p-6 sm:p-8 lg:p-9 select-none card-tactile ${
        isFrontCard ? 'card-tactile-active border-slate-700/80' : ''
      }`}
    >
      {/* Top Section */}
      <div className="flex-1 flex flex-col justify-between">
        {/* Header: Course tag + due status */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className={`inline-flex items-center gap-2 text-xs sm:text-sm font-semibold ${theme.text}`}>
              <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
              {codeTag}
            </span>

            <span
              className={`text-xs sm:text-sm font-semibold ${
                isUrgent ? 'text-[#FF0055]' : 'text-slate-400'
              }`}
            >
              {statusText}
            </span>
          </div>

          {/* Optional Full Course Name Eyebrow */}
          {fullName && (
            <p className="text-[11px] sm:text-xs text-slate-500 mb-2 line-clamp-1">
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
          {/* File Attachments Badge in Description */}
          {assignment.attachments && assignment.attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300">
                <Paperclip className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">
                  Files ({assignment.attachments.length}):{' '}
                  <strong className="text-white font-mono">
                    {assignment.attachments.map((a) => a.name).join(', ')}
                  </strong>
                </span>
              </div>
            </div>
          )}

          {isSparseDescription ? (
            <p className="text-sm text-slate-500 italic">
              Limited details in calendar feed — open in Canvas for full instructions.
            </p>
          ) : (
            <div className={`space-y-3 text-slate-300 ${smartDesc.fontSizeClass} ${smartDesc.lineHeightClass}`}>
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
      <div className="pt-4 border-t border-slate-800/80 flex items-center text-xs sm:text-sm mt-4">
        {assignment.canvasUrl ? (
          <a
            href={assignment.canvasUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
          >
            <span>Open in Canvas</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <span className="text-slate-600 text-xs">No link available</span>
        )}
      </div>
    </div>
  );
}
