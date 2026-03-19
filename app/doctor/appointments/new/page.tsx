'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppointmentBookingWizard } from '@/components/appointments/AppointmentBookingWizard';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';

function DoctorBookingWrapper() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const [doctorId, setDoctorId] = useState<string | undefined>(undefined);

    // Pre-fill from URL (consultation follow-up flow passes these)
    const patientId = searchParams.get('patientId') || undefined;
    const type = searchParams.get('type') || undefined;
    const source = searchParams.get('source') || undefined;
    const parentAppointmentId = searchParams.get('parentAppointmentId') || undefined;
    const parentConsultationId = searchParams.get('parentConsultationId') || undefined;

    const isFollowUp = source === 'DOCTOR_FOLLOW_UP' || type === 'Follow-up';

    useEffect(() => {
        if (user) {
            doctorApi.getDoctorByUserId(user.id).then(res => {
                if (res.success && res.data) {
                    setDoctorId(res.data.id);
                }
            });
        }
    }, [user]);

    if (!user) return <div>Please log in...</div>;
    if (!doctorId) return <div className="p-8 text-center text-muted-foreground">Loading doctor profile...</div>;

    return (
        <div className="max-w-4xl mx-auto py-6 px-4">
            <AppointmentBookingWizard
                initialDoctorId={doctorId}
                initialPatientId={patientId}
                initialType={type}
                userRole="doctor"
                lockDoctor
                source={source}
                parentAppointmentId={parentAppointmentId ? Number(parentAppointmentId) : undefined}
                parentConsultationId={parentConsultationId ? Number(parentConsultationId) : undefined}
                onSuccess={() => {
                    // After follow-up: go to consultation room / queue
                    if (isFollowUp) {
                        router.push('/doctor/consultations');
                    } else {
                        router.push('/doctor/dashboard');
                    }
                }}
                onCancel={() => router.back()}
            />
        </div>
    );
}

export default function DoctorNewAppointmentPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="h-8 w-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-slate-500">Loading booking form...</p>
                </div>
            </div>
        }>
            <DoctorBookingWrapper />
        </Suspense>
    );
}
