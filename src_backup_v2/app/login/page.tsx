'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { DeadlnrLogo } from '@/components/Logo';
import { ArrowLeft, Mail, KeyRound, Check, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Step 1: Request Email OTP Code via Server API
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setMessage({ text: 'Please enter a valid email address.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification code.');
      }

      setStep('otp');
      setMessage({
        text: `Code sent to ${email} — check your inbox.`,
        type: 'success',
      });
    } catch (err: any) {
      setMessage({
        text: err.message || 'Failed to send verification code.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP Code (Supports 6 to 8 digit codes)
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = otpCode.trim();
    if (!cleanToken || cleanToken.length < 6) {
      setMessage({ text: 'Please enter the full verification code sent to your email.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), token: cleanToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid or expired verification code.');
      }

      setMessage({
        text: 'Account verified! Syncing your Canvas feed & settings...',
        type: 'success',
      });

      setTimeout(() => {
        window.location.href = '/settings';
      }, 1200);
    } catch (err: any) {
      setMessage({ text: err.message || 'Invalid or expired verification code.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080A0F] text-slate-100 flex flex-col font-sans selection:bg-[#FF3B00]/30 selection:text-[#FF3B00]">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#111622] p-8 backdrop-blur-xl card-tactile">
          <div className="flex justify-between items-center mb-6">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <DeadlnrLogo size={36} />
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-black text-white font-display mb-1">
              {step === 'email' ? 'Sign In / Register' : 'Verify Email Code'}
            </h1>
            <p className="text-sm text-slate-400">
              {step === 'email'
                ? "We'll send you a code"
                : `Enter the code sent to ${email}`}
            </p>
          </div>

          {message && (
            <div
              className={`mb-6 rounded-xl p-3 text-sm flex items-start gap-2 ${
                message.type === 'success'
                  ? 'bg-[#00E599]/10 text-[#00E599]'
                  : 'bg-[#FF0055]/10 text-[#FF0055]'
              }`}
            >
              {message.type === 'success' ? (
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {step === 'email' ? (
            /* Step 1 Form: Email Input */
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="student@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 pl-10 text-sm text-white placeholder-slate-500 focus:border-[#FF3B00] focus:outline-none focus:ring-1 focus:ring-[#FF3B00]"
                  />
                  <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FF3B00] hover:bg-[#FF3B00]/90 py-3.5 font-bold text-white active:scale-95 transition-all text-sm font-display disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Send Verification Code</span>
              </button>
            </form>
          ) : (
            /* Step 2 Form: Verification Code Input (Supports up to 8 digits) */
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                  Verification Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={8}
                    placeholder="52721567"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 pl-10 text-center text-lg font-mono font-bold tracking-widest text-white placeholder-slate-600 focus:border-[#00E599] focus:outline-none focus:ring-1 focus:ring-[#00E599]"
                  />
                  <KeyRound className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#00E599] hover:bg-[#00E599]/90 py-3.5 font-bold text-slate-950 active:scale-95 transition-all text-sm font-display disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 stroke-[3]" />}
                <span>Verify Code & Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setOtpCode('');
                  setMessage(null);
                }}
                className="w-full text-center text-xs text-slate-400 hover:text-white pt-2 flex items-center justify-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Use a different email address</span>
              </button>
            </form>
          )}

          <p className="mt-6 pt-6 border-t border-slate-800 text-center text-[11px] text-slate-500">
            Secure passwordless login
          </p>
        </div>
      </main>
    </div>
  );
}
