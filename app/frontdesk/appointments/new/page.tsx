'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppointmentBookingForm } from '@/components/appointments/AppointmentBookingForm';
import { format } from 'date-fns';

function NewAppointmentWrapper() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialDoctorId = searchParams.get('doctorId') || undefined;
    const initialDate = searchParams.get('date') || undefined;
    const initialTime = searchParams.get('time') || undefined;

    const handleSuccess = (appointmentId?: number, date?: Date) => {
        let url = '/frontdesk/appointments';
        const params = new URLSearchParams();

        if (appointmentId) {
            params.append('highlight', appointmentId.toString());
        }

        if (date) {
            params.append('date', format(date, 'yyyy-MM-dd'));
        }

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        router.push(url);
    };

    return (
        <AppointmentBookingForm
            initialDoctorId={initialDoctorId}
            initialDate={initialDate}
            initialTime={initialTime}
            userRole="frontdesk"
            source="FRONTDESK_SCHEDULED"
            onSuccess={handleSuccess}
            onCancel={() => router.back()}
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
