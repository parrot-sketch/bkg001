'use client';

import { useState, useEffect } from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { doctorApi } from '@/lib/api/doctor';
import { AppointmentBookingWizard } from '@/components/appointments/AppointmentBookingWizard';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';

function FollowUpContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  // The parent appointment ID comes from the [id] route segment, e.g. /frontdesk/appointments/47/followup
  const appointmentId = params.id as string | undefined;
  const patientId = searchParams.get('patientId');
  const doctorId = searchParams.get('doctorId');

  const [patient, setPatient] = useState<PatientResponseDto | null>(null);
  const [doctor, setDoctor] = useState<DoctorResponseDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [patientRes, doctorRes] = await Promise.all([
          patientId ? frontdeskApi.getPatient(patientId) : Promise.resolve(null),
          doctorId ? doctorApi.getDoctor(doctorId) : Promise.resolve(null),
        ]);

        if (patientRes?.success) setPatient(patientRes.data || null);
        if (doctorRes?.success) setDoctor(doctorRes.data || null);
      } catch (err) {
        console.error('Failed to load follow-up data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [patientId, doctorId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#caa26a]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <AppointmentBookingWizard
          userRole="frontdesk"
          source={AppointmentSource.DOCTOR_FOLLOW_UP}
          parentAppointmentId={appointmentId ? parseInt(appointmentId, 10) : undefined}
          initialPatientId={patientId || undefined}
          initialPatient={patient || undefined}
          initialDoctorId={doctorId || undefined}
          initialDoctor={doctor || undefined}
          initialType="Follow-up"
          lockDoctor={!!doctorId}
          variant="page"
          onSuccess={(newAppointmentId) => {
            if (appointmentId) {
              router.push(`/frontdesk/appointments/${appointmentId}`);
            } else {
              router.push('/frontdesk/appointments');
            }
          }}
          onCancel={() => {
            if (appointmentId) {
              router.push(`/frontdesk/appointments/${appointmentId}`);
            } else {
              router.push('/frontdesk/appointments');
            }
          }}
        />
      </div>
    </div>
  );
}

export default function FrontdeskFollowUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#caa26a]" />
      </div>
    }>
      <FollowUpContent />
    </Suspense>
  );
}