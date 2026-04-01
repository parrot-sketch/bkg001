'use client';

import { Users, Clock, Play, Activity, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useDoctorDashboard, useDoctorQueue } from '@/hooks/use-doctor-dashboard';
import { useStartConsultation } from '@/hooks/doctor/useConsultation';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface PatientQueueProps {
  isLoading: boolean;
}

export function PatientQueue({ isLoading: parentLoading }: PatientQueueProps) {
  const { error, refetch } = useDoctorDashboard();
  const queue = useDoctorQueue();
  const router = useRouter();
  const { mutate: startConsultation, isPending: isStarting } = useStartConsultation();

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
      <section className="bg-white border border-slate-200/60 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <Users className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-slate-800">Patient Queue</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  // Error state — distinguishable from empty queue
  if (error) {
    return (
      <section className="bg-white border border-slate-200/60 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <Users className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-slate-800">Patient Queue</h2>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 bg-red-50 rounded-full flex items-center justify-center mb-3">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <p className="text-sm font-medium text-red-700">Failed to load queue</p>
          <p className="text-xs text-red-400 mt-1 mb-3">
            {error instanceof Error ? error.message : 'An error occurred'}
          </p>
          <Button size="sm" variant="outline" onClick={() => refetch()} className="rounded-lg text-xs">
            Retry
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section 
      id="queue"
      className="bg-white border border-slate-200/60 rounded-xl shadow-sm overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
        <div className="flex items-center gap-2.5">
          <Users className="h-4 w-4 text-stone-400" />
          <h2 className="text-sm font-semibold text-stone-800">Patient Queue</h2>
          {queue.length > 0 && (
            <Badge variant="outline" className="text-xs border-stone-200 text-stone-500">
              {queue.length}
            </Badge>
          )}
        </div>
        {queue.length > 0 && (
          <span className="text-xs text-stone-400">
            Next: {queue[0]?.patientName?.split(' ')[0]}
          </span>
        )}
      </div>

      <div className="p-0">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50/30">
            <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <Users className="h-6 w-6 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-600">No patients in queue</p>
            <p className="text-xs text-slate-400 mt-1">
              Patients will appear here when checked in
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {queue.map((patient, index) => {
              const patientName = patient.patientName;
              
              return (
                <div
                  key={patient.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Queue Position */}
                    <div className={cn(
                      'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold',
                      index === 0 
                        ? 'bg-stone-100 text-stone-600' 
                        : 'bg-stone-50 text-stone-400'
                    )}>
                      {index + 1}
                    </div>

                    {/* Avatar */}
                    <Avatar className="h-10 w-10 border border-stone-200">
                      <AvatarFallback className="bg-stone-100 text-stone-500 text-sm font-bold">
                        {patient.patientName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>

                    {/* Patient Info */}
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">
                        {patientName}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="h-3 w-3" />
                          Waited {patient.waitTime}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500">
                          {patient.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Walk-in Badge */}
                    {patient.isWalkIn && (
                      <Badge variant="outline" className="text-xs border-stone-200 text-stone-500">
                        Walk-in
                      </Badge>
                    )}
                    {/* Queue Status Badge */}
                    {patient.status === 'IN_CONSULTATION' ? (
                      <Badge variant="outline" className="text-xs border-stone-300 text-stone-600 font-medium">
                        In Progress
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs border-stone-200 text-stone-500">
                        Waiting
                      </Badge>
                    )}

                    {/* Action Button */}
                    {patient.status === 'IN_CONSULTATION' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/doctor/consultations/${patient.appointmentId}/session`)}
                        className="text-xs font-medium min-w-[70px]"
                      >
                        <Activity className="h-3 w-3 mr-1.5" />
                        Continue
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleStartConsultation(patient)}
                        disabled={isStarting}
                        className="bg-stone-900 hover:bg-black text-white text-xs font-medium min-w-[70px]"
                      >
                        {isStarting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-1.5" />
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
        )}
      </div>
    </section>
  );
}