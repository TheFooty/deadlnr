'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#08090a] text-white/95 flex flex-col items-center justify-center p-6">
      <p className="text-6xl font-medium font-display text-[#828fff] mb-4">Oops</p>
      <h1 className="text-xl font-medium text-white font-display mb-2">Something went wrong</h1>
      <p className="text-sm text-white/55 max-w-xs text-center mb-8">
        An unexpected error occurred. Try again — your data is safe.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-[#5e6ad2] hover:bg-[#5e6ad2]/90 px-5 py-2.5 text-sm font-medium text-white transition-colors font-display"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="rounded-xl bg-white/[0.06] border border-white/10 hover:bg-white/[0.1] px-5 py-2.5 text-sm font-medium text-white/90 transition-colors font-display"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
