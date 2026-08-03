'use client';

import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export function DeadlnrLogo({ size = 32, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M6 3H18M6 21H18M7 3L11.2 9.3C11.6 9.9 11.6 10.7 11.2 11.3L7 17.6C6.4 18.5 7.1 19.7 8.2 19.7H15.8C16.9 19.7 17.6 18.5 17 17.6L12.8 11.3C12.4 10.7 12.4 9.9 12.8 9.3L17 3"
        stroke="#FF3B00"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 2L6 13H12L11 22L18 11H12L13 2Z"
        fill="#00E599"
        opacity="0.85"
      />
    </svg>
  );
}
