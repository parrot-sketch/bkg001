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
import { AlertCircle, Check, Clock } from 'lucide-react';
import { MobileIntakeForm } from '@/components/patient/intake-form/MobileIntakeForm';
import { IntakeLoadingScreen, IntakeStatusScreen } from '@/components/patient/intake-form/ui/IntakeShell';

type SessionState =
    | { status: 'loading' }
    | { status: 'valid'; expiresAt: string }
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
                const res = await fetch(`/api/patient/intake/validate?sessionId=${encodeURIComponent(sessionId)}`);
                const data = await res.json().catch(() => ({}));

                if (!res.ok || !data.allowed) {
                    if (data.code === 'SESSION_EXPIRED') {
                        setSessionState({ status: 'expired' });
                    } else if (data.code === 'SESSION_SUBMITTED') {
                        setSessionState({ status: 'already_submitted' });
                    } else {
                        setSessionState({
                            status: 'invalid',
                            message: data.reason || data.error || 'This link is not valid.',
                        });
                    }
                    return;
                }

                const expiresAt = data.session?.expiresAt
                    ?? new Date(Date.now() + 60 * 60000).toISOString();
                setSessionState({ status: 'valid', expiresAt });
            } catch {
                setSessionState({ status: 'invalid', message: 'Could not connect. Check your internet connection and try again.' });
            }
        }

        validateSession();
    }, [sessionId]);

    if (sessionState.status === 'loading') {
        return <IntakeLoadingScreen message="Opening your registration form…" />;
    }

    if (sessionState.status === 'expired') {
        return (
            <IntakeStatusScreen
                icon={<Clock className="h-9 w-9" />}
                tone="warning"
                title="This form timed out"
                message="For your privacy, forms expire after a while. Any answers you entered are saved on this phone."
                action={{ href: '/intake', label: 'Continue my form' }}
                footnote="Nothing has been submitted yet."
            />
        );
    }

    if (sessionState.status === 'already_submitted') {
        return (
            <IntakeStatusScreen
                icon={<Check className="h-10 w-10" strokeWidth={2.5} />}
                tone="success"
                title="You're all set"
                message="Your details have already been received. Please take a seat and the front desk will call you shortly."
                footnote="You can close this page."
            />
        );
    }

    if (sessionState.status === 'invalid') {
        return (
            <IntakeStatusScreen
                icon={<AlertCircle className="h-9 w-9" />}
                tone="error"
                title="This link isn't working"
                message={sessionState.message}
                action={{ href: '/intake', label: 'Start a new form' }}
                footnote="If this keeps happening, please ask the front desk for help."
            />
        );
    }

    return (
        <MobileIntakeForm
            sessionId={sessionId}
            expiresAt={sessionState.expiresAt}
        />
    );
}

export default function IntakePage() {
    return (
        <Suspense fallback={<IntakeLoadingScreen message="Opening your registration form…" />}>
            <IntakePageContent />
        </Suspense>
    );
}
