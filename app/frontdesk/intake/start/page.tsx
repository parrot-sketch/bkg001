'use client';

/**
 * /frontdesk/intake/start — QR Station (Live)
 *
 * Enhanced workflow:
 *   1. Receptionist generates QR code and link
 *   2. Receptionist copies link and manually sends to patient via WhatsApp
 *   3. Patient receives link and fills form at their own pace
 *   4. When form is submitted → Auto-redirect to /frontdesk/intake/pending
 *
 * 3-state machine:
 *   idle      → receptionist hasn't generated a session yet
 *   active    → session generated, QR shown, link available, poll running every 4s
 *   expired   → timer elapsed or session expired before submission
 *
 * The poll hits GET /api/frontdesk/intake/[sessionId]/status every 4 seconds.
 * When status flips to SUBMITTED, auto-redirects to pending page so receptionist
 * can see all submissions in one place.
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api/client';

/* ── Types ── */
interface DeskQr {
  qrCodeUrl: string;
  intakeFormUrl: string;
}

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

type StationState = 'idle' | 'active' | 'expired';

const POLL_INTERVAL_MS = 4000;

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function printQr(params: { title: string; subtitle: string; qrDataUrl: string; url: string }) {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!printWindow) return;

  const title = escapeHtml(params.title);
  const subtitle = escapeHtml(params.subtitle);
  const url = escapeHtml(params.url);

  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
        <style>
          :root { color-scheme: light; }
          body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color: #0f172a; }
          .page { padding: 32px; display: grid; gap: 18px; place-items: center; text-align: center; }
          .brand { display: inline-flex; align-items: center; gap: 10px; }
          .logo { height: 44px; width: 44px; border-radius: 12px; background: #e11d48; display: grid; place-items: center; color: white; font-weight: 800; }
          h1 { margin: 0; font-size: 22px; }
          p { margin: 0; color: #475569; font-size: 13px; line-height: 1.45; }
          .qr { margin-top: 6px; border: 1px solid #e2e8f0; border-radius: 18px; padding: 18px; }
          .qr img { width: 320px; height: 320px; display: block; }
          .url { margin-top: 8px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace; font-size: 12px; color: #0f172a; word-break: break-all; }
          .hint { margin-top: 2px; font-size: 12px; color: #64748b; }
          @media print {
            .page { padding: 10mm; }
            .qr img { width: 110mm; height: 110mm; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="brand">
            <div class="logo">NS</div>
            <div>
              <h1>${title}</h1>
              <p>${subtitle}</p>
            </div>
          </div>

          <div class="qr">
            <img src="${params.qrDataUrl}" alt="QR Code" />
            <div class="url">${url}</div>
            <div class="hint">Scan to open the secure intake form.</div>
          </div>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();

  const img = printWindow.document.querySelector('img');
  if (img) {
    img.addEventListener('load', () => {
      printWindow.focus();
      printWindow.print();
    });
    img.addEventListener('error', () => {
      printWindow.focus();
      printWindow.print();
    });
  } else {
    printWindow.focus();
    printWindow.print();
  }
}

export default function StartIntakePage() {
  const router = useRouter();

  const [stationState, setStationState] = useState<StationState>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<IntakeSession | null>(null);
  const [deskQr, setDeskQr] = useState<DeskQr | null>(null);
  const [minutesLeft, setMinutesLeft] = useState(0);
  const [copied, setCopied] = useState(false);

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
      setDeskQr(null);
      const result = await apiClient.post<IntakeSession>('/frontdesk/intake/start');
      if (!result.success) throw new Error(result.error || 'Failed to start intake session');
      const data = result.data;
      setSession(data);
      setMinutesLeft(data.minutesRemaining);
      setStationState('active');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Load permanent desk QR ── */
  const handleLoadDeskQr = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSession(null);
      stopCountdown();
      stopPoll();
      const result = await apiClient.get<DeskQr>('/frontdesk/intake/desk-qr');
      if (!result.success) throw new Error(result.error || 'Failed to load desk QR code');
      setDeskQr(result.data);
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
        const result = await apiClient.get<SessionStatus>(
          `/frontdesk/intake/${session.sessionId}/status`
        );
        if (!result.success) return; // silent — retry next tick

        const data = result.data;

        if (data.status === 'SUBMITTED' || data.status === 'CONFIRMED') {
          stopPoll();
          stopCountdown();
          // Auto-redirect to pending page when form is submitted
          // This allows frontdesk to manually send form link via WhatsApp and be notified automatically
          router.push('/frontdesk/patients');
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
  }, [stationState, session, stopPoll, stopCountdown, router]);

  const copyUrl = () => {
    const url = session?.intakeFormUrl ?? deskQr?.intakeFormUrl;
    if (url) {
      navigator.clipboard.writeText(url);
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
              <div className="space-y-2">
                <Button
                  onClick={handleLoadDeskQr}
                  disabled={isLoading}
                  className="w-full h-11 bg-slate-900 hover:bg-black text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
                >
                  {isLoading
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading…</>
                    : <><QrCode className="mr-2 h-4 w-4" />Show Permanent Desk QR</>
                  }
                </Button>
                <Button
                  onClick={handleStartIntake}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full h-11 text-sm font-semibold rounded-xl border-slate-200"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Generate Timed Session (WhatsApp)
                </Button>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  The permanent desk QR never expires. Each patient scan creates a fresh private session automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════
     STATE: ACTIVE — QR shown, polling
     ═══════════════════════════════════════ */
  if (stationState === 'active' && (session || deskQr)) {
    const timerUrgent = session ? (minutesLeft <= 10 && minutesLeft > 0) : false;
    const title = deskQr ? 'Desk QR (Non-expiring)' : 'Session Active — Waiting for patient';
    const subtitle = deskQr
      ? 'Patients can scan this anytime. Each scan creates a fresh private session.'
      : 'Ask the patient to scan this code';
    const qrSrc = session?.qrCodeUrl ?? deskQr?.qrCodeUrl ?? '';
    const linkUrl = session?.intakeFormUrl ?? deskQr?.intakeFormUrl ?? '';

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
                {title}
              </div>
              {session ? (
                <span className={cn('flex items-center gap-1.5', timerUrgent && 'text-amber-600')}>
                  <Clock className="h-3.5 w-3.5" />
                  {minutesLeft} min
                </span>
              ) : (
                <span className="text-xs text-emerald-700">Never expires</span>
              )}
            </div>

            {/* QR code */}
            <div className="flex flex-col items-center px-7 py-7">
              <div className="rounded-2xl p-5">
                <img
                  src={qrSrc}
                  alt="Patient Intake QR Code"
                  className="w-52 h-52"
                />
              </div>
              <div className="text-center mt-3">
                <p className="text-sm font-semibold text-slate-800 mb-0.5">{subtitle}</p>
                <p className="text-xs text-slate-400">They will complete the form on their own phone.</p>
              </div>
              {/* Subtle polling indicator */}
              {session ? (
                <div className="flex items-center gap-1.5 mt-3 text-[10px] text-slate-300">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  Checking for submission…
                </div>
              ) : (
                <div className="mt-3 text-[10px] text-slate-300">
                  Tip: print and place this QR at the desk.
                </div>
              )}
            </div>

            {/* URL copy */}
            <div className="mx-5 mb-5">
              <p className="text-[11px] text-slate-400 mb-1.5">Or share this link directly:</p>
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 px-3 py-2">
                <span className="flex-1 text-xs font-mono text-slate-600 truncate">{linkUrl}</span>
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
                onClick={() =>
                  printQr({
                    title: 'Patient Intake (Secure)',
                    subtitle: deskQr ? 'Permanent desk QR — does not expire' : 'Timed intake session — expires automatically',
                    qrDataUrl: qrSrc,
                    url: linkUrl,
                  })
                }
              >
                Print QR
              </Button>
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

          {session && (
            <p className="text-center text-[10px] text-slate-300 font-mono">
              Session: {session.sessionId}
            </p>
          )}
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
