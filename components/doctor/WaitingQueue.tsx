'use client';

import { Clock, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { useStartConsultation } from '@/hooks/doctor/useConsultation';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface WaitingQueueProps {
  appointments: any[];
  onStartConsultation?: (appointment: any) => void;
}

export function WaitingQueue({ appointments, onStartConsultation }: WaitingQueueProps) {
  const { mutate: startConsultation, isPending } = useStartConsultation();
  const router = useRouter();

  const sorted = [...appointments].sort((a, b) => {
    const timeA = a.checkedInAt ? new Date(a.checkedInAt).getTime() : 0;
    const timeB = b.checkedInAt ? new Date(b.checkedInAt).getTime() : 0;
    return timeA - timeB;
  });

  const handleStart = (apt: any) => {
    if (onStartConsultation) {
      onStartConsultation(apt);
    } else {
      startConsultation(apt.id, {
        onSuccess: () => {
          router.push(`/doctor/consultations/session/${apt.id}`);
        }
      });
    }
  };

  if (appointments.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
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
                className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-xs text-slate-400 w-5">{index + 1}</span>
                  <Avatar className="h-9 w-9 border border-slate-200">
                    <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-bold">
                      {patientName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-medium text-slate-900 truncate">
                      {patientName}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      <span>{waitTime}</span>
                      <span>•</span>
                      <span>{apt.type || 'Consultation'}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  {apt.status === 'IN_CONSULTATION' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/doctor/consultations/session/${apt.id}`)}
                      className="h-8 text-xs"
                    >
                      Continue
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleStart(apt)}
                      disabled={isPending}
                      className="h-8 text-xs bg-slate-900 hover:bg-black text-white"
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
