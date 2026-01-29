'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppointmentBookingForm } from '@/components/appointments/AppointmentBookingForm';

function NewAppointmentWrapper() {
    const searchParams = useSearchParams();
    const initialDoctorId = searchParams.get('doctorId') || undefined;

    return (
        <AppointmentBookingForm
            initialDoctorId={initialDoctorId}
            userRole="frontdesk"
        />
    );
}

export default function NewAppointmentPage() {
    return (
        <Suspense fallback={<div>Loading form...</div>}>
            <NewAppointmentWrapper />
        </Suspense>
    );
}
