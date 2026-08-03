'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DeadlnrLogo } from './Logo';
import { Settings, History, Layers, User, LogOut } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Deck', Icon: Layers },
  { href: '/history', label: 'History', Icon: History },
  { href: '/settings', label: 'Settings', Icon: Settings },
];

export function Navbar() {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.isLoggedIn && data.email) {
            setUserEmail(data.email);
          }
        }
      } catch (err) {
        // Ignore
      }
    }
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUserEmail(null);
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

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
                  active ? 'text-white' : 'text-slate-500 hover:text-slate-300'
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

          {userEmail ? (
            <div className="ml-3 flex items-center gap-2">
              <span className="hidden md:inline text-xs font-mono text-[#00E599] bg-[#00E599]/10 px-2 py-0.5 rounded border border-[#00E599]/20 truncate max-w-[140px]">
                {userEmail}
              </span>
              <button
                onClick={handleLogout}
                title="Log Out"
                className="text-sm text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 px-2 py-1 rounded"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="ml-3 text-sm text-slate-500 hover:text-white transition-colors"
            >
              <User className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Account</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
