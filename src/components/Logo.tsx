'use client';

import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * Distinctive Deadlnr Brand Logo:
 * Fuses an Hourglass/Clock motif with an Electric Lightning Triage Cut (#00E599 & #FF3B00).
 * Completely distinct from Tinder's flame icon.
 */
export function DeadlnrLogo({ size = 40, className = '' }: LogoProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center shrink-0 rounded-2xl bg-gradient-to-br from-[#111622] to-[#1a2234] border border-slate-700/80 p-2 shadow-xl transition-transform active:scale-95 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Hourglass Outer Frame */}
        <path
          d="M6 3H18M6 21H18M7 3L11.2 9.3C11.6 9.9 11.6 10.7 11.2 11.3L7 17.6C6.4 18.5 7.1 19.7 8.2 19.7H15.8C16.9 19.7 17.6 18.5 17 17.6L12.8 11.3C12.4 10.7 12.4 9.9 12.8 9.3L17 3"
          stroke="#FF3B00"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Triage Lightning Core */}
        <path
          d="M13 2L6 13H12L11 22L18 11H12L13 2Z"
          fill="#00E599"
          className="opacity-90"
        />
      </svg>

      {/* Pulse Dot */}
      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E599] opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00E599]"></span>
      </span>
    </div>
  );
}
