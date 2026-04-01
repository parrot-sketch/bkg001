'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface PatientProfileHeaderProps {
  patientName?: string;
  fromConsultation: boolean;
  consultationAppointmentId: string | null;
  onBackToPatients: () => void;
}

export function PatientProfileHeader({
  patientName,
  fromConsultation,
  consultationAppointmentId,
  onBackToPatients,
}: PatientProfileHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {fromConsultation && consultationAppointmentId ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/doctor/consultations/session/${consultationAppointmentId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Consultation
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToPatients}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patients
          </Button>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">{patientName || 'Patient Profile'}</h1>
          <p className="text-muted-foreground mt-1">Medical records and visit history</p>
        </div>
      </div>
    </div>
  );
}
