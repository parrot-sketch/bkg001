'use client';

/**
 * /frontdesk/intake/start — QR Station
 *
 * The frontdesk generates a new patient intake session.
 * A large QR code and countdown timer are shown so the patient
 * can scan and fill the form on their phone.
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  QrCode,
  ArrowLeft,
  RefreshCw,
  Clock,
  CheckCircle2,
  Copy,
  AlertCircle,
  Loader2,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api/client';

interface IntakeSession {
  sessionId: string;
  qrCodeUrl: string;
  intakeFormUrl: string;
  expiresAt: string;
  minutesRemaining: number;
}

export default function StartIntakePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<IntakeSession | null>(null);
  const [minutesLeft, setMinutesLeft] = useState(0);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleStartIntake = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await apiClient.post<IntakeSession>('/frontdesk/intake/start');
      if (!result.success) {
        throw new Error((result as any).error || 'Failed to start intake session');
      }
      const data = (result as any).data as IntakeSession;
      setSession(data);
      setMinutesLeft(data.minutesRemaining);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  /* Countdown timer */
  useEffect(() => {
    if (!session) return;
    timerRef.current = setInterval(() => {
      setMinutesLeft((m) => {
        if (m <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return m - 1;
      });
    }, 60000);
    return () => clearInterval(timerRef.current!);
  }, [session]);

  const copyUrl = () => {
    if (session?.intakeFormUrl) {
      navigator.clipboard.writeText(session.intakeFormUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sessionExpired = minutesLeft === 0 && !!session;
  const timerUrgent = minutesLeft <= 10 && minutesLeft > 0;

  /* ── Idle state ── */
  if (!session) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Back */}
          <Link href="/frontdesk/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 mb-8 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-7 pt-7 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-sm">
                  <QrCode className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900">New Patient Intake</h1>
                  <p className="text-xs text-slate-400">Generate a QR code for walk-in registration</p>
                </div>
              </div>
            </div>

            {/* How it works */}
            <div className="px-7 py-5 space-y-3">
              {[
                { icon: QrCode, text: 'Click below to generate a unique QR code session' },
                { icon: Users, text: 'Show the QR to the patient — they scan it and fill the form privately on their phone' },
                { icon: CheckCircle2, text: 'Submission appears in Pending Intakes for your review' },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[11px] font-bold text-slate-500">{i + 1}</span>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="mx-7 mb-4 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* CTA */}
            <div className="px-7 pb-7">
              <Button
                onClick={handleStartIntake}
                disabled={isLoading}
                className="w-full h-11 bg-slate-900 hover:bg-black text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating session…</>
                ) : (
                  <><QrCode className="mr-2 h-4 w-4" />Generate QR Code</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Active QR station ── */
  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        {/* Back */}
        <Link href="/frontdesk/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>

        {/* QR Card */}
        <div className={cn(
          "bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors",
          sessionExpired ? 'border-amber-300' : 'border-slate-200'
        )}>
          {/* Status bar */}
          <div className={cn(
            "px-5 py-3 flex items-center justify-between border-b text-sm font-medium",
            sessionExpired
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          )}>
            <div className="flex items-center gap-2">
              {sessionExpired
                ? <AlertCircle className="h-4 w-4" />
                : <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              }
              {sessionExpired ? 'Session Expired' : 'Session Active'}
            </div>
            {!sessionExpired && (
              <span className={cn("flex items-center gap-1.5", timerUrgent && "text-amber-600")}>
                <Clock className="h-3.5 w-3.5" />
                {minutesLeft} min remaining
              </span>
            )}
          </div>

          {/* QR code */}
          <div className="flex flex-col items-center px-7 py-7">
            <div className={cn(
              "rounded-2xl p-5 transition-opacity",
              sessionExpired ? 'opacity-30 grayscale' : 'opacity-100'
            )}>
              <img
                src={session.qrCodeUrl}
                alt="Patient Intake QR Code"
                className="w-52 h-52"
              />
            </div>

            {sessionExpired ? (
              <div className="text-center mt-3">
                <p className="text-sm font-semibold text-amber-700 mb-1">Session has expired</p>
                <p className="text-xs text-slate-400">Generate a new QR code for the next patient.</p>
              </div>
            ) : (
              <div className="text-center mt-3">
                <p className="text-sm font-semibold text-slate-800 mb-0.5">Ask the patient to scan this code</p>
                <p className="text-xs text-slate-400">They will complete the form on their phone.</p>
              </div>
            )}
          </div>

          {/* URL copy */}
          {!sessionExpired && (
            <div className="mx-5 mb-5">
              <p className="text-[11px] text-slate-400 mb-1.5">Or share this link directly:</p>
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 px-3 py-2">
                <span className="flex-1 text-xs font-mono text-slate-600 truncate">{session.intakeFormUrl}</span>
                <button
                  onClick={copyUrl}
                  className="shrink-0 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
                >
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-slate-100 px-5 py-4 flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-9 rounded-xl text-sm border-slate-200"
              onClick={() => { setSession(null); setMinutesLeft(0); }}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              {sessionExpired ? 'New Session' : 'Start Another'}
            </Button>
            <Link href="/frontdesk/intake/pending" className="flex-1">
              <Button className="w-full h-9 rounded-xl text-sm bg-slate-900 hover:bg-black text-white">
                View Pending
              </Button>
            </Link>
          </div>
        </div>

        {/* Session ID footnote */}
        <p className="text-center text-[10px] text-slate-300 font-mono">
          Session: {session.sessionId}
        </p>
      </div>
    </div>
  );
}
