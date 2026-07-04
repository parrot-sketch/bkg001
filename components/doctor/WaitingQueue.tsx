'use client';

import { useMemo } from 'react';
import { Clock, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useStartConsultation } from '@/hooks/doctor/useConsultation';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

interface WaitingQueueProps {
  appointments: AppointmentResponseDto[];
  onStartConsultation?: (appointment: AppointmentResponseDto) => void;
}

export function WaitingQueue({ appointments, onStartConsultation }: WaitingQueueProps) {
  const { mutate: startConsultation, isPending } = useStartConsultation();
  const router = useRouter();

  const sorted = useMemo(() => {
    return [...appointments].sort((a, b) => {
      const timeA = a.checkedInAt ? new Date(a.checkedInAt).getTime() : 0;
      const timeB = b.checkedInAt ? new Date(b.checkedInAt).getTime() : 0;
      return timeA - timeB;
    });
  }, [appointments]);

  const handleStart = (apt: AppointmentResponseDto) => {
    if (onStartConsultation) {
      onStartConsultation(apt);
    } else {
      startConsultation(apt.id, {
        onSuccess: () => {
          router.push(`/doctor/consultations/session/${apt.id}`);
        },
      });
    }
  };

  if (appointments.length === 0) return null;

  return (
    <Card className="border border-[#e7d6bf] shadow-sm">
      <CardContent className="p-0">
        <div className="divide-y divide-[#e7d6bf]">
          {sorted.map((apt, index) => {
            const patientName = apt.patient
              ? `${apt.patient.firstName} ${apt.patient.lastName}`
              : 'Patient';
            const waitTime = apt.checkedInAt
              ? formatDistanceToNow(new Date(apt.checkedInAt), { addSuffix: false })
              : '';

            return (
              <div
                key={apt.id}
                className="flex items-center justify-between p-3.5 hover:bg-[#e7d6bf]/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-xs font-medium text-[#2c2e4b]/50 w-5 shrink-0">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-medium text-[#2c2e4b] truncate">
                      {patientName}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-[#2c2e4b]/60 mt-0.5">
                      <Clock className="h-3 w-3 text-[#caa26a]" />
                      <span>{waitTime}</span>
                      <span className="text-[#e7d6bf]">.</span>
                      <span>{apt.type || 'Consultation'}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 ml-3">
                  {apt.status === 'IN_CONSULTATION' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/doctor/consultations/session/${apt.id}`)}
                      className="h-8 text-xs rounded-lg border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
                    >
                      Continue
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleStart(apt)}
                      disabled={isPending}
                      className="h-8 text-xs rounded-lg bg-[#2c2e4b] hover:bg-[#1a1c2f] text-white"
                    >
                      {isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Play className="h-3 w-3 mr-1" />
                          Start
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function WaitingQueueSkeleton() {
  return (
    <Card className="border border-[#e7d6bf] shadow-sm">
      <CardContent className="p-0">
        <div className="divide-y divide-[#e7d6bf]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="h-9 w-9 rounded-full bg-[#e7d6bf]/50" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32 bg-[#e7d6bf]/50" />
                  <Skeleton className="h-3 w-24 bg-[#e7d6bf]/50" />
                </div>
              </div>
              <Skeleton className="h-8 w-16 bg-[#e7d6bf]/50" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
