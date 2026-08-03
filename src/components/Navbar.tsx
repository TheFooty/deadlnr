'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DeadlnrLogo } from './Logo';
import { Settings, History, Layers, User, LogOut, Calendar } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Deck', Icon: Layers },
  { href: '/tasks', label: 'Tasks', Icon: Calendar },
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
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <DeadlnrLogo size={26} />
          <span className="text-base sm:text-lg font-bold tracking-tight text-white font-display">
            Dead<span className="text-[#FF3B00]">lnr</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-1.5">
          {navLinks.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`relative px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 rounded-xl ${
                  active
                    ? 'text-white bg-slate-900/80 border border-slate-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </Link>
            );
          })}

          {userEmail ? (
            <div className="ml-1 sm:ml-2 flex items-center gap-1.5">
              <span className="hidden lg:inline text-[11px] font-mono text-[#00E599] bg-[#00E599]/10 px-2 py-0.5 rounded border border-[#00E599]/20 truncate max-w-[130px]">
                {userEmail}
              </span>
              <button
                onClick={handleLogout}
                title="Log Out"
                className="text-xs text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1 p-1.5 rounded-xl bg-slate-900 border border-slate-800"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden md:inline font-semibold">Logout</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="ml-1 sm:ml-2 text-xs font-bold text-[#FF3B00] bg-[#FF3B00]/10 hover:bg-[#FF3B00]/20 border border-[#FF3B00]/30 px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 font-display"
            >
              <User className="h-3.5 w-3.5" />
              <span>Login</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
