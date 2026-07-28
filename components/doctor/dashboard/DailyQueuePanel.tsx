'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppointmentStatus, canStartConsultation, isAwaitingConfirmation } from '@/domain/enums/AppointmentStatus';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  [AppointmentStatus.PENDING]: { bg: 'bg-[#e7d6bf]/60', text: 'text-[#2c2e4b]/70', label: 'Pending' },
  [AppointmentStatus.PENDING_DOCTOR_CONFIRMATION]: { bg: 'bg-[#e7d6bf]/60', text: 'text-[#2c2e4b]/70', label: 'Awaiting Confirmation' },
  [AppointmentStatus.SCHEDULED]: { bg: 'bg-[#e7d6bf]/30', text: 'text-[#2c2e4b]', label: 'Scheduled' },
  [AppointmentStatus.CONFIRMED]: { bg: 'bg-[#e7d6bf]/30', text: 'text-[#2c2e4b]', label: 'Confirmed' },
  [AppointmentStatus.CHECKED_IN]: { bg: 'bg-[#caa26a]/20', text: 'text-[#2c2e4b]', label: 'Checked In' },
  [AppointmentStatus.READY_FOR_CONSULTATION]: { bg: 'bg-[#caa26a]/20', text: 'text-[#2c2e4b]', label: 'Ready' },
  [AppointmentStatus.IN_CONSULTATION]: { bg: 'bg-[#caa26a]/30', text: 'text-[#2c2e4b]', label: 'In Consultation' },
  [AppointmentStatus.COMPLETED]: { bg: 'bg-[#e7d6bf]/60', text: 'text-[#2c2e4b]/70', label: 'Completed' },
  [AppointmentStatus.CANCELLED]: { bg: 'bg-[#e7d6bf]/40', text: 'text-[#2c2e4b]/60', label: 'Cancelled' },
  [AppointmentStatus.NO_SHOW]: { bg: 'bg-[#e7d6bf]/40', text: 'text-[#2c2e4b]/60', label: 'No Show' },
};

interface DailyQueueAppointment {
  id: number;
  patientId: string;
  patient: {
    firstName: string;
    lastName: string;
    fileNumber: string;
  };
  appointmentDate: Date;
  time: string;
  type: string;
  status: string;
}

interface DailyQueuePanelProps {
  appointments: DailyQueueAppointment[];
  isLoading?: boolean;
}

export function DailyQueuePanel({ appointments, isLoading }: DailyQueuePanelProps) {
  const router = useRouter();

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      const timeCompare = (a.time || '').localeCompare(b.time || '');
      if (timeCompare !== 0) return timeCompare;
      return a.id - b.id;
    });
  }, [appointments]);

  // No API call — navigate directly. The consultation room handles its own init.
  const handleNavigate = (appointment: DailyQueueAppointment) => {
    router.push(`/doctor/consultations/session/${appointment.id}?start=true`);
  };

  const getActionLabel = (status: string) => {
    if (status === AppointmentStatus.IN_CONSULTATION) return 'Continue';
    if (canStartConsultation(status as AppointmentStatus)) return 'Start';
    return null;
  };

  const isActionEnabled = (status: string) => {
    return status === AppointmentStatus.IN_CONSULTATION || canStartConsultation(status as AppointmentStatus);
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] ?? { bg: 'bg-[#e7d6bf]/60', text: 'text-[#2c2e4b]/70', label: status };
  };

  if (isLoading) {
    return (
      <Card className="border border-[#e7d6bf] bg-white shadow-sm">
        <CardHeader className="border-b border-[#e7d6bf] px-5 py-4">
          <CardTitle className="text-base font-semibold text-[#2c2e4b]">Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[#e7d6bf]">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-12 text-center shrink-0">
                  <div className="h-4 w-8 bg-[#e7d6bf]/50 rounded animate-pulse mx-auto" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-[#e7d6bf]/50 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-[#e7d6bf]/50 rounded animate-pulse" />
                </div>
                <div className="h-7 w-20 bg-[#e7d6bf]/50 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sortedAppointments.length === 0) {
    return (
      <Card className="border border-[#e7d6bf] bg-white shadow-sm">
        <CardHeader className="border-b border-[#e7d6bf] px-5 py-4">
          <CardTitle className="text-base font-semibold text-[#2c2e4b]">Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-12 text-center">
          <p className="text-sm text-[#2c2e4b]/50">No appointments scheduled for today</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-[#e7d6bf] bg-white shadow-sm overflow-hidden">
      <CardHeader className="border-b border-[#e7d6bf] px-5 py-4 bg-white">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#2c2e4b]">Today's Schedule</CardTitle>
          <span className="text-xs text-[#2c2e4b]/60 font-medium">
            {sortedAppointments.length} appointment{sortedAppointments.length !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-[#e7d6bf]">
          {sortedAppointments.map((appointment) => {
            const status = appointment.status;
            const statusConfig = getStatusConfig(status);
            const actionLabel = getActionLabel(status);
            const actionEnabled = isActionEnabled(status);
            const isAwaiting = isAwaitingConfirmation(status as AppointmentStatus);
            const patientName = appointment.patient
              ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
              : 'Unknown Patient';

            return (
              <div
                key={appointment.id}
                className={cn(
                  'flex items-center gap-4 px-5 py-3.5 transition-colors',
                  actionEnabled && 'hover:bg-[#e7d6bf]/20 cursor-pointer'
                )}
                onClick={() => {
                  if (actionEnabled) handleNavigate(appointment);
                }}
              >
                <div className="w-14 text-center shrink-0">
                  <p className="text-sm font-semibold text-[#2c2e4b] leading-none tabular-nums">
                    {appointment.time || '--:--'}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#2c2e4b] truncate">{patientName}</p>
                    {appointment.patient?.fileNumber && (
                      <span className="text-[10px] text-[#2c2e4b]/50 font-mono shrink-0">
                        #{appointment.patient.fileNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[#2c2e4b]/60 truncate">{appointment.type || 'Consultation'}</span>
                    {isAwaiting && (
                      <>
                        <span className="text-[#e7d6bf]">•</span>
                        <span className="text-[10px] text-[#caa26a] font-medium">Needs confirmation</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={cn('text-[10px] font-medium border-0', statusConfig.bg, statusConfig.text)}>
                    {statusConfig.label}
                  </Badge>
                  {actionLabel && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigate(appointment);
                      }}
                      className={cn(
                        'h-8 px-3 text-xs rounded-lg shadow-sm',
                        status === AppointmentStatus.IN_CONSULTATION
                          ? 'bg-violet-600 hover:bg-violet-700 text-white'
                          : 'bg-[#2c2e4b] hover:bg-[#1a1c2f] text-white'
                      )}
                    >
                      {actionLabel}
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
