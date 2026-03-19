'use client';

import { Users, Clock, Play, Activity, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useDoctorQueue } from '@/hooks/doctor/useDoctorQueue';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';

interface PatientQueueProps {
  doctorId: string | undefined;
  isAuthenticated: boolean;
}

export function PatientQueue({ doctorId, isAuthenticated }: PatientQueueProps) {
  const { data: queue, isLoading } = useDoctorQueue(doctorId, isAuthenticated && !!doctorId);
  const router = useRouter();

  const handleStartConsultation = (queueEntry: { appointmentId: number | null; patientId: string; id: number }) => {
    if (queueEntry.appointmentId) {
      router.push(`/doctor/consultations/${queueEntry.appointmentId}/session`);
    } else {
      // For walk-ins, we need to create a consultation or handle differently
      router.push(`/doctor/consultations/new?patientId=${queueEntry.patientId}`);
    }
  };

  if (isLoading) {
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

  const queueData = queue || [];

  return (
    <section 
      id="queue"
      className="bg-white border border-slate-200/60 rounded-xl shadow-sm overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <Users className="h-4 w-4 text-amber-600" />
          <h2 className="text-sm font-semibold text-slate-800">Patient Queue</h2>
          {queueData.length > 0 && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
              {queueData.length}
            </Badge>
          )}
        </div>
        {queueData.length > 0 && (
          <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md">
            Next: {queueData[0]?.patient?.firstName}
          </span>
        )}
      </div>

      <div className="p-0">
        {queueData.length === 0 ? (
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
            {queueData.map((patient, index) => {
              const patientName = `${patient.patient.firstName} ${patient.patient.lastName}`;
              
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
                        ? 'bg-amber-100 text-amber-700' 
                        : 'bg-slate-100 text-slate-500'
                    )}>
                      {index + 1}
                    </div>

                    {/* Avatar */}
                    <Avatar className="h-10 w-10 border border-slate-200">
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-bold">
                        {patient.patient.firstName[0]}{patient.patient.lastName[0]}
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
                      <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                        Walk-in
                      </Badge>
                    )}
                    {/* Queue Status Badge */}
                    {patient.status === 'IN_CONSULTATION' ? (
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                        In Progress
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200">
                        Waiting
                      </Badge>
                    )}

                    {/* Start Button - Always active regardless of triage status */}
                    <Button
                      size="sm"
                      onClick={() => handleStartConsultation(patient)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
                    >
                      <Play className="h-3 w-3 mr-1.5" />
                      Start
                    </Button>
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
