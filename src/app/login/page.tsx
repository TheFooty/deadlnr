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

  // Step 2: Verify 6-digit OTP Code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = otpCode.trim();
    if (!cleanToken || cleanToken.length < 6) {
      setMessage({ text: 'Please enter the 6-digit verification code sent to your email.', type: 'error' });
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
        text: 'Account verified! Redirecting to settings...',
        type: 'success',
      });

      setTimeout(() => {
        window.location.href = '/settings';
      }, 1000);
    } catch (err: any) {
      setMessage({ text: err.message || 'Invalid or expired verification code.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090a] text-white/95 flex flex-col font-sans selection:bg-[#5e6ad2]/30 selection:text-[#828fff]">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md rounded-xl border border-white/[0.1] bg-[#191a1b] p-8 backdrop-blur-xl card-tactile">
          <div className="flex justify-between items-center mb-6">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.1] text-white/55 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <DeadlnrLogo size={36} />
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-medium text-white font-display mb-1">
              {step === 'email' ? 'Sign In / Register' : 'Verify Email Code'}
            </h1>
            <p className="text-sm text-white/55">
              {step === 'email'
                ? "We'll send you a 6-digit code"
                : `Enter the 6-digit code sent to ${email}`}
            </p>
          </div>

          {message && (
            <div
              className={`mb-6 rounded-xl p-3 text-sm flex items-start gap-2 ${
                message.type === 'success'
                  ? 'bg-[#27a644]/10 text-[#27a644]'
                  : 'bg-[#dc2626]/10 text-[#dc2626]'
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
                <label htmlFor="email" className="block text-sm font-semibold text-white/80 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    placeholder="student@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.12] bg-white/[0.03] px-4 py-3 pl-10 text-sm text-white placeholder-slate-500 focus:border-[#5e6ad2] focus:outline-none focus:ring-1 focus:ring-[#5e6ad2]"
                  />
                  <Mail className="absolute left-3 top-3.5 h-4 w-4 text-white/40" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#5e6ad2] hover:bg-[#5e6ad2]/90 py-3.5 font-medium text-white active:scale-95 transition-all text-sm font-display disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Send Verification Code</span>
              </button>
            </form>
          ) : (
            /* Step 2 Form: 6-Digit Code Input */
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label htmlFor="otp" className="block text-sm font-semibold text-white/80 mb-1.5">
                  Verification Code
                </label>
                <div className="relative">
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="••••••"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onPaste={(e) => {
                      // Auto-fill full pasted code (mobile OTP UX)
                      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                      if (pasted.length === 6) {
                        e.preventDefault();
                        setOtpCode(pasted);
                      }
                    }}
                    className="w-full rounded-xl border border-white/[0.12] bg-white/[0.03] px-4 py-3 pl-10 text-center text-xl font-mono font-medium tracking-widest text-white placeholder-slate-600 focus:border-[#27a644] focus:outline-none focus:ring-1 focus:ring-[#27a644]"
                  />
                  <KeyRound className="absolute left-3 top-3.5 h-4 w-4 text-white/40" />
                </div>
                {/* Progress dots */}
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${
                        otpCode.length > i ? 'w-5 bg-[#27a644]' : 'w-1.5 bg-white/[0.08]'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#27a644] hover:bg-[#27a644]/90 py-3.5 font-medium text-[#08090a] active:scale-95 transition-all text-sm font-display disabled:opacity-50"
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
                className="w-full text-center text-xs text-white/55 hover:text-white pt-2 flex items-center justify-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Use a different email address</span>
              </button>
            </form>
          )}

          <p className="mt-6 pt-6 border-t border-white/[0.1] text-center text-[11px] text-white/40">
            Secure passwordless login
          </p>
        </div>
      </main>
    </div>
  );
}
