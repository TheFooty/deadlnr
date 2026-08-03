'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DeadlnrLogo } from './Logo';
import { Settings, History, Layers, User } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Deck', Icon: Layers },
  { href: '/history', label: 'History', Icon: History },
  { href: '/settings', label: 'Settings', Icon: Settings },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[#080A0F]/90 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <DeadlnrLogo size={28} />
          <span className="text-lg font-bold tracking-tight text-white">
            Dead<span className="text-[#FF3B00]">lnr</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navLinks.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`relative px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? 'text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">{label}</span>
                {active && (
                  <span className="absolute inset-x-1 -bottom-[calc(0.5rem+1px)] h-px bg-[#FF3B00]" />
                )}
              </Link>
            );
          })}

          <Link
            href="/login"
            className="ml-3 text-sm text-slate-500 hover:text-white transition-colors"
          >
            <User className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Account</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
