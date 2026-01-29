'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppointmentBookingForm } from '@/components/appointments/AppointmentBookingForm';
import { useAuth } from '@/hooks/patient/useAuth';
import { doctorApi } from '@/lib/api/doctor';

function DoctorBookingWrapper() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const [doctorId, setDoctorId] = useState<string | undefined>(undefined);

    // Pre-fill patient from URL if coming from consultation
    const patientId = searchParams.get('patientId') || undefined;
    const type = searchParams.get('type') || undefined;

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
            onSuccess={() => {
                // Determine where to go back
                // For now, go to appointments list, or dashboard?
                // The form defaults to router.back(), but let's be explicit if needed
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
