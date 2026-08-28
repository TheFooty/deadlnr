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

// Course color theme based on course code / platform
export function getCourseTheme(courseName: string) {
  const name = (courseName || '').toUpperCase();
  // Linear-system course palette: muted, single-luminance-step tints.
  if (name.includes('KOGNITY') || name.includes('KOG')) {
    return { dot: 'bg-[#22d3ee]', text: 'text-[#22d3ee]', border: 'border-[#22d3ee]/30', bg: 'bg-[#22d3ee]/10' };
  }
  if (name.includes('CS') || name.includes('COMP') || name.includes('CODE')) {
    return { dot: 'bg-[#7170ff]', text: 'text-[#7170ff]', border: 'border-[#7170ff]/30', bg: 'bg-[#7170ff]/10' };
  }
  if (name.includes('MATH') || name.includes('STAT') || name.includes('CALC')) {
    return { dot: 'bg-[#818cf8]', text: 'text-[#818cf8]', border: 'border-[#818cf8]/30', bg: 'bg-[#818cf8]/10' };
  }
  if (name.includes('PHYS') || name.includes('CHEM') || name.includes('BIO')) {
    return { dot: 'bg-[#22d3ee]', text: 'text-[#22d3ee]', border: 'border-[#22d3ee]/30', bg: 'bg-[#22d3ee]/10' };
  }
  if (name.includes('ENGL') || name.includes('RHET') || name.includes('LIT')) {
    return { dot: 'bg-[#c084fc]', text: 'text-[#c084fc]', border: 'border-[#c084fc]/30', bg: 'bg-[#c084fc]/10' };
  }
  if (name.includes('HIST') || name.includes('GOV') || name.includes('POLI')) {
    return { dot: 'bg-[#fbbf24]', text: 'text-[#fbbf24]', border: 'border-[#fbbf24]/30', bg: 'bg-[#fbbf24]/10' };
  }
  return { dot: 'bg-[#5e6ad2]', text: 'text-[#828fff]', border: 'border-[#5e6ad2]/40', bg: 'bg-[#5e6ad2]/10' };
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
      className={`relative flex h-full w-full flex-col justify-between overflow-hidden rounded-xl border p-6 sm:p-8 select-none card-tactile ${
        isFrontCard
          ? isUrgent
            ? 'card-urgent'
            : 'card-tactile-active'
          : ''
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
              className={`text-xs sm:text-sm font-medium ${
                isUrgent ? 'text-[#FF2D6B]' : 'text-white/55'
              }`}
            >
              {statusText}
            </span>
          </div>

          {/* Optional Full Course Name Eyebrow */}
          {fullName && (
            <p className="text-[11px] sm:text-xs text-white/40 mb-2 line-clamp-1">
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
            <p className="text-sm text-white/40 italic">
              Limited details in calendar feed — open link below for full instructions.
            </p>
          ) : (
            <div className={`space-y-3 text-white/80 ${smartDesc.fontSizeClass} ${smartDesc.lineHeightClass}`}>
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
      <div className="pt-4 border-t border-white/[0.1]/80 flex items-center text-xs sm:text-sm mt-4">
        {assignment.canvasUrl ? (
          <a
            href={assignment.canvasUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-white/55 hover:text-white transition-colors"
          >
            <span>
              {assignment.canvasUrl.includes('kognity')
                ? 'Open in Kognity'
                : assignment.canvasUrl.includes('instructure') || assignment.canvasUrl.includes('canvas')
                ? 'Open in Canvas'
                : 'Open Link'}
            </span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <span className="text-white/30 text-xs">No link available</span>
        )}
      </div>
    </div>
  );
}
