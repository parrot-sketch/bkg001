'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect from /doctor/consultations to /doctor/appointments
 * 
 * This page exists for backward compatibility. The consultations page
 * has been merged into the appointments page with priority-based sections.
 * 
 * All consultation functionality is now available on the unified
 * /doctor/appointments page with:
 * - Active Consultations section
 * - Pending Confirmations section
 * - Waiting Queue section
 * - Consultation History section
 */

export default function ConsultationsRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        // Smooth redirect to the new unified page
        router.push('/doctor/appointments');
    }, [router]);

    return (
        <div className="flex items-center justify-center h-screen bg-slate-50">
            <div className="text-center space-y-3">
                <div className="h-10 w-10 bg-slate-200 rounded-full mx-auto animate-pulse" />
                <p className="text-sm text-slate-400">Redirecting to appointments...</p>
            </div>
        </div>
    );
}