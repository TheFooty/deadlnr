'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Flame, Mail, Lock, ArrowRight, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createClient();

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage({ text: 'Account created! Check your email for confirmation link or sign in.', type: 'success' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setMessage({ text: 'Successfully signed in! Redirecting...', type: 'success' });
        setTimeout(() => router.push('/'), 1000);
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Authentication failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setMessage({ text: 'Please enter your email first.', type: 'error' });
      return;
    }
    setLoading(true);
    setMessage(null);

    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
      setMessage({ text: 'Magic link sent! Check your inbox to sign in instantly.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to send magic link', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 font-sans selection:bg-orange-500/30 selection:text-orange-400">
      {/* Brand Header */}
      <Link href="/" className="group flex items-center gap-3 mb-8 transition-transform active:scale-95">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-600 via-orange-500 to-amber-400 p-2.5 text-white shadow-xl shadow-orange-500/30">
          <Flame className="h-7 w-7 fill-white text-white" />
        </div>
        <div>
          <span className="text-3xl font-black tracking-tight text-white">
            Dead<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500">lnr</span>
          </span>
          <p className="text-xs font-semibold text-slate-400">Swipe your deadlines into submission.</p>
        </div>
      </Link>

      {/* Auth Box */}
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        <div className="text-center mb-6">
          <h2 className="text-xl font-extrabold text-white">
            {isSignUp ? 'Create your Deadlnr account' : 'Sign in to sync your feed'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Store your encrypted Canvas iCal feed & preferred AI chat
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 rounded-2xl border p-3.5 text-xs font-semibold flex items-center gap-2 ${
              message.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> : <ShieldCheck className="h-4 w-4 text-rose-400 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                placeholder="student@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
          <button
            onClick={handleMagicLink}
            disabled={loading}
            type="button"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-slate-200 border border-slate-700 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-orange-400" />
            <span>Send Email Magic Link (No Password)</span>
          </button>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="hover:text-white underline underline-offset-2 font-semibold"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>

            <Link href="/" className="text-orange-400 hover:text-orange-300 font-bold">
              Skip to Demo →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
