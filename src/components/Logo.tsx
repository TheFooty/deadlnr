'use client';

import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * Deadlnr brand mark — a lightning bolt in a rounded indigo tile.
 * Matches the favicon (icon.svg). Single, cohesive mark.
 */
export function DeadlnrLogo({ size = 24, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Deadlnr"
    >
      <rect width="64" height="64" rx="14" fill="#5e6ad2" />
      <rect x="0" y="0" width="64" height="30" rx="14" fill="#ffffff" opacity="0.12" />
      <path d="M35.5 12 L19 36 h11 l-3.5 16 L43 26 H31.5 Z" fill="#ffffff" />
    </svg>
  );
}
