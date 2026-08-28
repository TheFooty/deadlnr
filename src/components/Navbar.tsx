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
    <header
      className="sticky top-0 z-50 w-full border-b"
      style={{
        backgroundColor: 'rgba(8, 9, 10, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderColor: 'var(--border-soft)',
      }}
    >
      <div className="mx-auto flex h-[52px] max-w-5xl items-center justify-between px-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <DeadlnrLogo size={22} />
          <span className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--fg)' }}>
            Dead<span style={{ color: 'var(--accent-hover)' }}>lnr</span>
          </span>
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-1">
          {navLinks.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                title={label}
                className={`flex items-center justify-center px-1.5 sm:px-3 py-1.5 text-[13px] font-medium transition-colors rounded-md ${
                  active ? '' : 'hover:text-white'
                } ${active ? '' : ''}`}
                style={active ? { color: 'var(--fg)', backgroundColor: 'rgba(255,255,255,0.06)' } : { color: 'var(--muted)' }}
              >
                <Icon className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline ml-1.5">{label}</span>
              </Link>
            );
          })}
        </nav>

        {userEmail ? (
          <div className="ml-1 flex items-center gap-1.5 shrink-0">
            <span
              className="hidden lg:inline text-[11px] font-mono truncate max-w-[120px]"
              style={{ color: 'var(--accent-hover)', border: '1px solid rgba(113,112,255,0.25)', padding: '2px 8px', borderRadius: '9999px' }}
            >
              {userEmail}
            </span>
            <button
              onClick={handleLogout}
              title="Log Out"
              aria-label="Log Out"
              className="text-xs p-1.5 rounded-md transition-colors flex items-center gap-1 hover:text-white"
              style={{ color: 'var(--muted)', border: '1px solid var(--border-soft)' }}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden md:inline font-medium">Logout</span>
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="ml-1 inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-[13px] font-medium text-white shrink-0 transition-colors"
            style={{ backgroundColor: 'var(--accent)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
          >
            <User className="h-3.5 w-3.5" />
            <span>Login</span>
          </Link>
        )}
      </div>
    </header>
  );
}
