'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface PatientProfileHeaderProps {
  fromConsultation: boolean;
  consultationAppointmentId: string | null;
  onBackToPatients: () => void;
}

export function PatientProfileHeader({
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
              onClick={() => router.push(`/doctor/consultations/${consultationAppointmentId}/session`)}
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
          <h1 className="text-3xl font-bold text-foreground">Patient Profile</h1>
          <p className="text-muted-foreground mt-1">View and manage patient information</p>
        </div>
      </div>
    </div>
  );
}
