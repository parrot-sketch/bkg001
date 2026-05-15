'use client';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { useDoctorQueue } from '@/hooks/use-doctor-dashboard';
import { useStartConsultation } from '@/hooks/doctor/useConsultation';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

interface PatientQueueProps {
  isLoading: boolean;
}

export function PatientQueue({ isLoading: parentLoading }: PatientQueueProps) {
  const queue = useDoctorQueue();
  const router = useRouter();
  const { mutate: startConsultation, isPending } = useStartConsultation();

  const handleStartConsultation = (queueEntry: { appointmentId: number | null; patientId: string; id: number }) => {
    if (queueEntry.appointmentId) {
      startConsultation(queueEntry.appointmentId, {
        onSuccess: () => {
          router.push(`/doctor/consultations/session/${queueEntry.appointmentId}`);
        }
      });
    } else {
      router.push(`/doctor/consultations/new?patientId=${queueEntry.patientId}`);
    }
  };

  if (parentLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="h-4 w-24 bg-slate-200 animate-pulse rounded" />
          </div>
          <div className="divide-y divide-slate-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-8 w-16 rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-medium text-slate-900">Patient Queue</h3>
        </div>
        {queue.length === 0 ? (
          <div className="py-10 text-center px-4">
            <p className="text-sm text-slate-500">No patients waiting</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {queue.map((patient, index) => (
              <div
                key={patient.id}
                className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-xs text-slate-400 w-5 text-center">{index + 1}</span>
                  <Avatar className="h-9 w-9 border border-slate-200">
                    <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-bold">
                      {patient.patientName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-medium text-slate-900 truncate">
                      {patient.patientName}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{patient.waitTime}</span>
                      {!patient.isWalkIn && <span>• {patient.type}</span>}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  {patient.status === 'IN_CONSULTATION' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/doctor/consultations/session/${patient.appointmentId}`)}
                      className="h-8 text-xs"
                    >
                      Continue
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleStartConsultation(patient)}
                      disabled={isPending}
                      className="h-8 text-xs bg-slate-900 hover:bg-black text-white"
                    >
                      {isPending ? '...' : 'Start'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
