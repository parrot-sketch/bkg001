'use client';

import { useDoctorQueue } from '@/hooks/use-doctor-dashboard';
import { useStartConsultation } from '@/hooks/doctor/useConsultation';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, Play } from 'lucide-react';

export function PatientQueuePanel() {
  const queue = useDoctorQueue();
  const router = useRouter();
  const { mutate: startConsultation, isPending } = useStartConsultation();

  const handleStart = (apt: any) => {
    startConsultation(apt.id, {
      onSuccess: () => {
        router.push(`/doctor/consultations/session/${apt.id}`);
      },
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Patient Queue</CardTitle>
          {queue.length > 0 && (
            <span className="text-xs text-slate-500 font-medium">{queue.length} waiting</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {queue.length === 0 ? (
          <div className="py-10 text-center px-4">
            <p className="text-sm text-slate-500">No patients waiting</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {queue.map((patient, index) => {
              const initials = patient.patientName
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .toUpperCase();

              return (
                <div key={patient.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-xs text-slate-400 w-5 text-center">{index + 1}</span>
                    <Avatar className="h-9 w-9 border border-slate-200">
                      <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-medium text-slate-900 truncate">
                        {patient.patientName}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {patient.waitTime} • {patient.type}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleStart(patient)}
                    disabled={isPending}
                    className="h-8 px-3 text-xs bg-slate-900 hover:bg-black text-white"
                  >
                    {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                    Start
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
