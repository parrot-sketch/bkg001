'use client';

import { useMemo } from 'react';
import { Clock, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useStartConsultation } from '@/hooks/doctor/useConsultation';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import type { QueuePatient } from '@/hooks/doctor/useDoctorQueue';

interface WaitingQueueProps {
  queue: QueuePatient[];
  onStartConsultation?: (appointmentId: number) => void;
}

export function WaitingQueue({ queue, onStartConsultation }: WaitingQueueProps) {
  const { mutate: startConsultation, isPending } = useStartConsultation();
  const router = useRouter();

  const sorted = useMemo(() => {
    return [...queue].sort((a, b) => {
      const timeA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
      const timeB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
      return timeA - timeB;
    });
  }, [queue]);

  const handleStart = (appointmentId: number) => {
    if (onStartConsultation) {
      onStartConsultation(appointmentId);
    } else {
      startConsultation(appointmentId, {
        onSuccess: () => {
          router.push(`/doctor/consultations/session/${appointmentId}`);
        },
      });
    }
  };

  if (queue.length === 0) return null;

  return (
    <Card className="border border-[#e7d6bf] shadow-sm">
      <CardContent className="p-0">
        <div className="divide-y divide-[#e7d6bf]">
          {sorted.map((item, index) => {
            const patientName = item.patient
              ? `${item.patient.firstName} ${item.patient.lastName}`
              : 'Patient';
            const waitTime = item.addedAt
              ? formatDistanceToNow(new Date(item.addedAt), { addSuffix: false })
              : '';

            return (
              <div
                key={item.id}
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
                      <span>{item.type || 'Consultation'}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 ml-3">
                  {item.status === 'IN_CONSULTATION' && item.appointmentId ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/doctor/consultations/session/${item.appointmentId}`)}
                      className="h-8 text-xs rounded-lg border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
                    >
                      Continue
                    </Button>
                  ) : item.appointmentId ? (
                    <Button
                      size="sm"
                      onClick={() => handleStart(item.appointmentId as number)}
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
                  ) : null}
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
