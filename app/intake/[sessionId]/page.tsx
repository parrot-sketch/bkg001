'use client';

/**
 * /intake/[sessionId] — Standalone Patient Intake Page
 *
 * This is a fully isolated, no-layout-wrapper page.
 * It has no sidebar, no nav, no authentication requirement.
 * It is the page a patient lands on after scanning the QR code.
 *
 * Security: session is validated on mount against the API.
 * If expired, already-submitted, or invalid — appropriate states are shown.
 */

import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Shield, AlertCircle, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { MobileIntakeForm } from '@/components/patient/intake-form/MobileIntakeForm';

type SessionState =
    | { status: 'loading' }
    | { status: 'valid'; minutesRemaining: number }
    | { status: 'expired' }
    | { status: 'already_submitted' }
    | { status: 'invalid'; message: string };

function IntakePageContent() {
    const params = useParams();
    const sessionId = params.sessionId as string;
    const [sessionState, setSessionState] = useState<SessionState>({ status: 'loading' });

    useEffect(() => {
        if (!sessionId) {
            setSessionState({ status: 'invalid', message: 'No session ID found in URL.' });
            return;
        }

        async function validateSession() {
            try {
                const res = await fetch(`/api/patient/intake/validate?sessionId=${sessionId}`);
                const data = await res.json();

                if (!res.ok || !data.allowed) {
                    const reason = data.reason || '';
                    if (reason.toLowerCase().includes('expired')) {
                        setSessionState({ status: 'expired' });
                    } else if (reason.toLowerCase().includes('already') || reason.toLowerCase().includes('submitted')) {
                        setSessionState({ status: 'already_submitted' });
                    } else {
                        setSessionState({ status: 'invalid', message: reason || 'This intake session is not valid.' });
                    }
                    return;
                }

                // Calculate minutes remaining
                const session = data.session;
                const expiresAt = session?.expiresAt ? new Date(session.expiresAt) : null;
                const minutesRemaining = expiresAt
                    ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 60000))
                    : 60;

                setSessionState({ status: 'valid', minutesRemaining });
            } catch {
                setSessionState({ status: 'invalid', message: 'Could not verify session. Please ask the receptionist to generate a new QR code.' });
            }
        }

        validateSession();
    }, [sessionId]);

    /* ── Loading ── */
    if (sessionState.status === 'loading') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white">
                <div className="text-center space-y-4">
                    <div className="h-14 w-14 rounded-full bg-rose-50 flex items-center justify-center mx-auto">
                        <Loader2 className="h-6 w-6 text-rose-500 animate-spin" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">Verifying session…</p>
                </div>
            </div>
        );
    }

    /* ── Expired ── */
    if (sessionState.status === 'expired') {
        return (
            <StatusScreen
                icon={<Clock className="h-7 w-7 text-amber-500" />}
                iconBg="bg-amber-50"
                title="Session Expired"
                message="This intake session has expired. Please ask the receptionist to generate a new QR code."
                hint="Sessions expire after 60 minutes for your security."
            />
        );
    }

    /* ── Already submitted ── */
    if (sessionState.status === 'already_submitted') {
        return (
            <StatusScreen
                icon={<CheckCircle2 className="h-7 w-7 text-emerald-500" />}
                iconBg="bg-emerald-50"
                title="Form Already Submitted"
                message="Your intake form has already been received. The receptionist will call you shortly."
                hint="You can close this browser tab."
            />
        );
    }

    /* ── Invalid ── */
    if (sessionState.status === 'invalid') {
        return (
            <StatusScreen
                icon={<AlertCircle className="h-7 w-7 text-red-500" />}
                iconBg="bg-red-50"
                title="Invalid Session"
                message={sessionState.message}
                hint="Please ask the receptionist for assistance."
            />
        );
    }

    /* ── Valid — show form ── */
    return (
        <MobileIntakeForm
            sessionId={sessionId}
            minutesRemaining={sessionState.minutesRemaining}
        />
    );
}

/* ── Shared status screen ── */
function StatusScreen({
    icon,
    iconBg,
    title,
    message,
    hint,
}: {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    message: string;
    hint: string;
}) {
    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Clinic header */}
            <div className="px-6 pt-10 pb-6 text-center border-b border-slate-100">
                <div className="inline-flex items-center gap-2 mb-1">
                    <div className="h-8 w-8 rounded-full bg-rose-600 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">NS</span>
                    </div>
                    <span className="font-bold text-slate-900 text-lg">Nairobi Sculpt</span>
                </div>
            </div>

            {/* Status content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-sm mx-auto w-full">
                <div className={`h-16 w-16 rounded-full ${iconBg} flex items-center justify-center mb-5`}>
                    {icon}
                </div>
                <h1 className="text-xl font-bold text-slate-900 mb-2">{title}</h1>
                <p className="text-slate-500 text-sm leading-relaxed mb-4">{message}</p>
                <p className="text-xs text-slate-400">{hint}</p>
            </div>

            {/* Privacy footer */}
            <div className="px-6 pb-8 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                    <Shield className="h-3 w-3" />
                    <span>Your information is encrypted and stored securely.</span>
                </div>
            </div>
        </div>
    );
}

export default function IntakePage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-white">
                    <Loader2 className="h-6 w-6 text-rose-500 animate-spin" />
                </div>
            }
        >
            <IntakePageContent />
        </Suspense>
    );
}
