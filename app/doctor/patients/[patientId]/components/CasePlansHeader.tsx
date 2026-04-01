'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface CasePlansHeaderProps {
  patientId: string;
  patientName: string;
  fromConsultation: boolean;
  consultationAppointmentId: string | null;
}

export function CasePlansHeader({
  patientId,
  patientName,
  fromConsultation,
  consultationAppointmentId,
}: CasePlansHeaderProps) {
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
            onClick={() => router.push(`/doctor/patients/${patientId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/doctor/patients')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patients
          </Button>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Case Plans</h1>
          <p className="text-muted-foreground mt-1">
            {patientName ? `Surgical case plans for ${patientName}` : 'View and manage surgical case plans'}
          </p>
        </div>
      </div>
    </div>
  );
}
