'use client';

/**
 * /frontdesk/intake/start — QR Station (Live)
 *
 * 4-state machine:
 *   idle      → receptionist hasn't generated a session yet
 *   active    → session generated, QR shown, poll running every 4s
 *   submitted → patient filled the form; show alert + direct link to review
 *   expired   → timer elapsed or session expired before submission
 *
 * The poll hits GET /api/frontdesk/intake/[sessionId]/status every 4 seconds.
 * When status flips to SUBMITTED the UI transforms into a prominent "Form Received"
 * banner so the receptionist can click straight into the review page.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api/client';
import { formatDistanceToNow } from 'date-fns';

/* ── Types ── */
interface IntakeSession {
  sessionId: string;
  qrCodeUrl: string;
  intakeFormUrl: string;
  expiresAt: string;
  minutesRemaining: number;
}

interface SessionStatus {
  sessionId: string;
  status: 'PENDING_SUBMISSION' | 'SUBMITTED' | 'CONFIRMED' | 'EXPIRED';
  expiresAt: string | null;
  patientName?: string;
  submittedAt?: string;
}

type StationState = 'idle' | 'active' | 'submitted' | 'expired';

const POLL_INTERVAL_MS = 4000;

export default function StartIntakePage() {
  const router = useRouter();

  const [stationState, setStationState] = useState<StationState>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<IntakeSession | null>(null);
  const [minutesLeft, setMinutesLeft] = useState(0);
  const [copied, setCopied] = useState(false);
  const [submissionInfo, setSubmissionInfo] = useState<{
    patientName: string;
    submittedAt: string;
  } | null>(null);

  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  /* ── Cleanup helpers ── */
  const stopCountdown = useCallback(() => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }, []);
  const stopPoll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const resetStation = useCallback(() => {
    stopCountdown();
    stopPoll();
    setSession(null);
    setMinutesLeft(0);
    setSubmissionInfo(null);
    setError(null);
    setStationState('idle');
  }, [stopCountdown, stopPoll]);

  /* ── Cleanup on unmount ── */
  useEffect(() => () => { stopCountdown(); stopPoll(); }, [stopCountdown, stopPoll]);

  /* ── Generate session ── */
  const handleStartIntake = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await apiClient.post<IntakeSession>('/frontdesk/intake/start');
      if (!result.success) throw new Error((result as any).error || 'Failed to start intake session');
      const data = (result as any).data as IntakeSession;
      setSession(data);
      setMinutesLeft(data.minutesRemaining);
      setStationState('active');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Countdown timer (runs while active) ── */
  useEffect(() => {
    if (stationState !== 'active' || !session) return;

    countdownRef.current = setInterval(() => {
      setMinutesLeft((m) => {
        if (m <= 1) {
          stopCountdown();
          // Only expire if not already submitted
          setStationState((s) => s === 'active' ? 'expired' : s);
          return 0;
        }
        return m - 1;
      });
    }, 60_000);

    return stopCountdown;
  }, [stationState, session, stopCountdown]);

  /* ── Poll loop (runs while active) ── */
  useEffect(() => {
    if (stationState !== 'active' || !session) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/frontdesk/intake/${session.sessionId}/status`);
        if (!res.ok) return; // silent — retry next tick

        const data: SessionStatus = await res.json();

        if (data.status === 'SUBMITTED' || data.status === 'CONFIRMED') {
          stopPoll();
          stopCountdown();
          setSubmissionInfo({
            patientName: data.patientName ?? 'Patient',
            submittedAt: data.submittedAt ?? new Date().toISOString(),
          });
          setStationState('submitted');
        } else if (data.status === 'EXPIRED') {
          stopPoll();
          stopCountdown();
          setStationState('expired');
        }
      } catch {
        // Network error — swallow and retry next tick
      }
    };

    // Run immediately on mount then every POLL_INTERVAL_MS
    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return stopPoll;
  }, [stationState, session, stopPoll, stopCountdown]);

  const copyUrl = () => {
    if (session?.intakeFormUrl) {
      navigator.clipboard.writeText(session.intakeFormUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /* ═══════════════════════════════════════
     STATE: IDLE
     ═══════════════════════════════════════ */
  if (stationState === 'idle') {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link href="/frontdesk/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 mb-8 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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

            <div className="px-7 py-5 space-y-3">
              {[
                { icon: QrCode, text: 'Click below to generate a unique QR code session' },
                { icon: Users, text: 'Patient scans it on their phone and fills the form privately' },
                { icon: CheckCircle2, text: 'This screen alerts you the moment they submit — click Review & Confirm' },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[11px] font-bold text-slate-500">{i + 1}</span>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            {error && (
              <div className="mx-7 mb-4 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="px-7 pb-7">
              <Button
                onClick={handleStartIntake}
                disabled={isLoading}
                className="w-full h-11 bg-slate-900 hover:bg-black text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
              >
                {isLoading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating session…</>
                  : <><QrCode className="mr-2 h-4 w-4" />Generate QR Code</>
                }
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════
     STATE: SUBMITTED — patient filled form
     ═══════════════════════════════════════ */
  if (stationState === 'submitted' && session && submissionInfo) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <Link href="/frontdesk/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>

          {/* Success card */}
          <div className="bg-white rounded-2xl border-2 border-emerald-300 shadow-sm overflow-hidden">
            {/* Green header bar */}
            <div className="px-5 py-4 bg-emerald-50 border-b border-emerald-200 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <UserCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-800">Form Received!</p>
                <p className="text-xs text-emerald-600">
                  {submissionInfo.submittedAt
                    ? `Submitted ${formatDistanceToNow(new Date(submissionInfo.submittedAt), { addSuffix: true })}`
                    : 'Just now'}
                </p>
              </div>
              <div className="ml-auto">
                <div className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            </div>

            {/* Patient name */}
            <div className="px-6 py-5 text-center border-b border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Patient</p>
              <p className="text-2xl font-bold text-slate-900">{submissionInfo.patientName}</p>
              <p className="text-sm text-slate-400 mt-1">has completed the intake form</p>
            </div>

            {/* Actions */}
            <div className="px-5 py-5 space-y-2.5">
              <Link href={`/frontdesk/intake/review/${session.sessionId}`} className="block">
                <Button className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm shadow-emerald-200/50 flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Review &amp; Confirm Patient
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full h-10 rounded-xl text-sm border-slate-200 text-slate-600"
                onClick={resetStation}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Start New Session
              </Button>
            </div>
          </div>

          <p className="text-center text-[10px] text-slate-300 font-mono">
            Session: {session.sessionId}
          </p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════
     STATE: ACTIVE — QR shown, polling
     ═══════════════════════════════════════ */
  if (stationState === 'active' && session) {
    const timerUrgent = minutesLeft <= 10 && minutesLeft > 0;

    return (
      <div className="min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <Link href="/frontdesk/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Status bar */}
            <div className="px-5 py-3 flex items-center justify-between border-b border-emerald-200 bg-emerald-50 text-sm font-medium text-emerald-700">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Session Active — Waiting for patient
              </div>
              <span className={cn('flex items-center gap-1.5', timerUrgent && 'text-amber-600')}>
                <Clock className="h-3.5 w-3.5" />
                {minutesLeft} min
              </span>
            </div>

            {/* QR code */}
            <div className="flex flex-col items-center px-7 py-7">
              <div className="rounded-2xl p-5">
                <img
                  src={session.qrCodeUrl}
                  alt="Patient Intake QR Code"
                  className="w-52 h-52"
                />
              </div>
              <div className="text-center mt-3">
                <p className="text-sm font-semibold text-slate-800 mb-0.5">Ask the patient to scan this code</p>
                <p className="text-xs text-slate-400">They will complete the form on their own phone.</p>
              </div>
              {/* Subtle polling indicator */}
              <div className="flex items-center gap-1.5 mt-3 text-[10px] text-slate-300">
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                Checking for submission…
              </div>
            </div>

            {/* URL copy */}
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

            {/* Actions */}
            <div className="border-t border-slate-100 px-5 py-4 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-9 rounded-xl text-sm border-slate-200"
                onClick={resetStation}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Start Another
              </Button>
              <Link href="/frontdesk/intake/pending" className="flex-1">
                <Button className="w-full h-9 rounded-xl text-sm bg-slate-900 hover:bg-black text-white">
                  View Pending
                </Button>
              </Link>
            </div>
          </div>

          <p className="text-center text-[10px] text-slate-300 font-mono">
            Session: {session.sessionId}
          </p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════
     STATE: EXPIRED
     ═══════════════════════════════════════ */
  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <Link href="/frontdesk/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>

        <div className="bg-white rounded-2xl border border-amber-300 shadow-sm overflow-hidden">
          <div className="px-5 py-3 flex items-center gap-2 border-b border-amber-200 bg-amber-50 text-sm font-medium text-amber-700">
            <AlertCircle className="h-4 w-4" />
            Session Expired
          </div>

          <div className="px-7 py-7 text-center">
            {session && (
              <div className="opacity-30 grayscale w-fit mx-auto mb-4">
                <img src={session.qrCodeUrl} alt="Expired QR Code" className="w-40 h-40" />
              </div>
            )}
            <p className="text-sm font-semibold text-amber-700 mb-1">This session has timed out</p>
            <p className="text-xs text-slate-400">The patient did not scan and submit within 60 minutes.</p>
          </div>

          <div className="border-t border-slate-100 px-5 py-4">
            <Button
              onClick={resetStation}
              className="w-full h-10 rounded-xl text-sm bg-slate-900 hover:bg-black text-white"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Generate New Session
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
