'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DeadlnrLogo } from './Logo';
import { Settings, History, Layers, User } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-[#080A0F]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Brand Identity with Custom Logo */}
        <Link href="/" className="group flex items-center gap-3 transition-transform active:scale-95">
          <DeadlnrLogo size={40} />

          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-white font-display leading-none">
              Dead<span className="text-[#FF3B00]">lnr</span>
            </span>
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#94A3B8] uppercase mt-0.5">
              Canvas Triage
            </span>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              pathname === '/'
                ? 'bg-[#FF3B00]/15 text-[#FF3B00] border border-[#FF3B00]/30 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Deck</span>
          </Link>

          <Link
            href="/history"
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              pathname === '/history'
                ? 'bg-[#FF3B00]/15 text-[#FF3B00] border border-[#FF3B00]/30 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
            }`}
          >
            <History className="h-4 w-4" />
            <span className="hidden xs:inline">History</span>
          </Link>

          <Link
            href="/settings"
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              pathname === '/settings'
                ? 'bg-[#FF3B00]/15 text-[#FF3B00] border border-[#FF3B00]/30 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span className="hidden xs:inline">Settings</span>
          </Link>

          <Link
            href="/login"
            className="ml-1 sm:ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-all hover:border-slate-700 active:scale-95"
          >
            <User className="h-3.5 w-3.5 text-[#FF3B00]" />
            <span className="hidden sm:inline">Account</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
