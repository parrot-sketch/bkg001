'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppointmentBookingForm } from '@/components/appointments/AppointmentBookingForm';
import { format } from 'date-fns';
import { ArrowLeft, User, Stethoscope, LayoutDashboard, CalendarPlus, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/* ── Source context config ── */
const SOURCE_CONFIG: Record<string, {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    backHref: string;
    backLabel: string;
    color: string;
}> = {
    dashboard: {
        label: 'Booking from Dashboard',
        description: 'Doctor pre-selected from available doctors panel',
        icon: LayoutDashboard,
        backHref: '/frontdesk/dashboard',
        backLabel: 'Back to Dashboard',
        color: 'bg-cyan-50 border-cyan-200 text-cyan-800',
    },
    patients: {
        label: 'Booking from Patient Registry',
        description: 'Patient pre-selected — choose a doctor and time',
        icon: User,
        backHref: '/frontdesk/patients',
        backLabel: 'Back to Patients',
        color: 'bg-indigo-50 border-indigo-200 text-indigo-800',
    },
    profile: {
        label: 'Booking from Patient Profile',
        description: 'Patient pre-selected — choose a doctor and time',
        icon: User,
        backHref: '#',   // dynamically set below using patientId
        backLabel: 'Back to Patient Profile',
        color: 'bg-violet-50 border-violet-200 text-violet-800',
    },
};

function NewAppointmentWrapper() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const initialPatientId = searchParams.get('patientId') || undefined;
    const initialDoctorId = searchParams.get('doctorId') || undefined;
    const initialDate = searchParams.get('date') || undefined;
    const initialTime = searchParams.get('time') || undefined;
    const sourceParam = searchParams.get('source') || undefined;

    // Map UI source param to BookingChannel enum
    const bookingChannel: BookingChannel | undefined = sourceParam === 'dashboard'
        ? BookingChannel.DASHBOARD
        : sourceParam === 'patients'
        ? BookingChannel.PATIENT_LIST
        : sourceParam === 'profile'
        ? BookingChannel.PATIENT_PROFILE
        : undefined;

    const sourceConfig = sourceParam ? SOURCE_CONFIG[sourceParam] : undefined;

    // For "profile" source, back link goes to the patient profile appointments tab
    const backHref = sourceParam === 'profile' && initialPatientId
        ? `/frontdesk/patient/${initialPatientId}?cat=appointments`
        : sourceConfig?.backHref;

    const handleSuccess = (appointmentId?: number, date?: Date) => {
        // After booking from patient profile → return to profile appointments tab
        if (sourceParam === 'profile' && initialPatientId) {
            let url = `/frontdesk/patient/${initialPatientId}?cat=appointments`;
            router.push(url);
            return;
        }

        // Default: go to appointments list with highlight
        let url = '/frontdesk/appointments';
        const params = new URLSearchParams();
        if (appointmentId) params.append('highlight', appointmentId.toString());
        if (date) params.append('date', format(date, 'yyyy-MM-dd'));
        if (params.toString()) url += `?${params.toString()}`;
        router.push(url);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
            {/* Enhanced Header Section */}
            <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between gap-4">
                        {/* Breadcrumb Navigation */}
                        <div className="flex items-center gap-2 min-w-0">
                            {backHref && backHref !== '#' ? (
                                <Link
                                    href={backHref}
                                    className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors shrink-0"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    <span className="hidden sm:inline">{sourceConfig?.backLabel || 'Back'}</span>
                                </Link>
                            ) : (
                                <button
                                    onClick={() => router.back()}
                                    className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors shrink-0"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    <span className="hidden sm:inline">Back</span>
                                </button>
                            )}
                            {sourceConfig && (
                                <>
                                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                                    <div className="flex items-center gap-2 min-w-0">
                                        <sourceConfig.icon className="h-4 w-4 text-slate-500 shrink-0" />
                                        <span className="text-sm font-medium text-slate-700 truncate">
                                            {sourceConfig.label}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Page Title */}
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <CalendarPlus className="h-4 w-4 text-primary" />
                            </div>
                            <h1 className="text-lg font-bold text-slate-900 hidden sm:block">
                                New Appointment
                            </h1>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Source Context Card */}
                {sourceConfig && (
                    <Card className="mb-6 border-slate-200 shadow-sm overflow-hidden">
                        <div className={`${sourceConfig.color} px-4 py-3`}>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-white/60 backdrop-blur-sm flex items-center justify-center shrink-0">
                                    <sourceConfig.icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold mb-0.5">{sourceConfig.label}</p>
                                    <p className="text-xs opacity-80">{sourceConfig.description}</p>
                                </div>
                                {initialPatientId && (
                                    <Badge variant="outline" className="bg-white/60 border-white/80 shrink-0">
                                        Patient Pre-selected
                                    </Badge>
                                )}
                                {initialDoctorId && (
                                    <Badge variant="outline" className="bg-white/60 border-white/80 shrink-0">
                                        Doctor Pre-selected
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </Card>
                )}

                {/* Booking Form */}
                <AppointmentBookingForm
                    initialPatientId={initialPatientId}
                    initialDoctorId={initialDoctorId}
                    initialDate={initialDate}
                    initialTime={initialTime}
                    userRole="frontdesk"
                    source={AppointmentSource.FRONTDESK_SCHEDULED}
                    bookingChannel={bookingChannel}
                    onSuccess={handleSuccess}
                    onCancel={() => {
                        if (backHref && backHref !== '#') {
                            router.push(backHref);
                        } else {
                            router.back();
                        }
                    }}
                />
            </div>
        </div>
    );
}

export default function NewAppointmentPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-sm text-muted-foreground animate-pulse">Loading booking form…</div>
            </div>
        }>
            <NewAppointmentWrapper />
        </Suspense>
    );
}
