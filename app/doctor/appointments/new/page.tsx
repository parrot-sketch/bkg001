'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppointmentBookingForm } from '@/components/appointments/AppointmentBookingForm';
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
        <AppointmentBookingForm
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
        />
    );
}

export default function DoctorNewAppointmentPage() {
    return (
        <Suspense fallback={<div>Loading form...</div>}>
            <DoctorBookingWrapper />
        </Suspense>
    );
}
